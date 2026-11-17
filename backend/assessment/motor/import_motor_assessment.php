<?php
// ============================================================
// IMPORT MOTOR ASSESSMENT — many ratings and notes at once, from an
// imported Fine / Gross Motor sheet. One transaction: either every
// row is saved or none is. Every child must be an active pupil of
// the teacher's own class.
// File: backend/assessment/motor/import_motor_assessment.php
// POST JSON: { class_id,
//              ratings: [{ pupil_id, skill_type, month, rating }],
//              notes:   [{ pupil_id, skill_type, note }] }
// ============================================================

session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');
set_exception_handler(function($e){
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
});

// Same role / user-id / error helpers the leave and flags endpoints use.
require_once __DIR__ . '/../../teacher_leave/leave_helpers.php';
if (leave_effective_role() !== 'teacher') leave_json_error(401, 'Not authorized.');

require_once __DIR__ . '/../../users/db_config.php';
$conn = get_db_connection();
$teacherId = leave_user_id($conn, 'teacher');
if (!$teacherId) leave_json_error(401, 'Could not determine teacher.');

// The class must belong to this teacher.
function motor_check_class($conn, $classId, $teacherId){
    $stmt = $conn->prepare("SELECT id FROM classes WHERE id = ? AND teacher_user_id = ? LIMIT 1");
    $stmt->bind_param('ii', $classId, $teacherId);
    $stmt->execute();
    $ok = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$ok) leave_json_error(403, 'This class does not belong to the logged-in teacher.');
}
// The child must be an active pupil of that class.
function motor_check_pupil($conn, $pupilId, $classId){
    $stmt = $conn->prepare("SELECT id FROM pupils WHERE id = ? AND class_id = ? AND active = 1 LIMIT 1");
    $stmt->bind_param('ii', $pupilId, $classId);
    $stmt->execute();
    $ok = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$ok) leave_json_error(403, 'This child is not in your class.');
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$classId = filter_var($input['class_id'] ?? null, FILTER_VALIDATE_INT);
$ratings = is_array($input['ratings'] ?? null) ? $input['ratings'] : [];
$notes   = is_array($input['notes'] ?? null) ? $input['notes'] : [];

if (!$classId) leave_json_error(400, 'class_id is required.');
if (!$ratings && !$notes) leave_json_error(400, 'Nothing to import.');
if (count($ratings) > 5000 || count($notes) > 2000) leave_json_error(400, 'File is too large to import in one go.');

motor_check_class($conn, $classId, $teacherId);

// Every active pupil of this class, so each row can be checked without a query per row.
$validPupils = [];
$stmt = $conn->prepare("SELECT id FROM pupils WHERE class_id = ? AND active = 1");
$stmt->bind_param('i', $classId);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) $validPupils[(int) $row['id']] = true;
$stmt->close();

$types  = ['fine', 'gross'];
$months = ['June', 'July', 'August', 'September', 'October'];

foreach ($ratings as $i => $r) {
    $pid = (int) ($r['pupil_id'] ?? 0);
    if (!isset($validPupils[$pid])) leave_json_error(400, "Rating row " . ($i + 1) . ": that child is not in your class.");
    if (!in_array($r['skill_type'] ?? '', $types, true)) leave_json_error(400, "Rating row " . ($i + 1) . ": skill_type must be fine or gross.");
    if (!in_array($r['month'] ?? '', $months, true)) leave_json_error(400, "Rating row " . ($i + 1) . ": month must be June to October.");
    require_once __DIR__ . '/motor_store.php'; if (motor_rating_norm($r['rating'] ?? '') === null) leave_json_error(400, "Rating row " . ($i + 1) . ": rating must be B, P or A.");
}
foreach ($notes as $i => $n) {
    $pid = (int) ($n['pupil_id'] ?? 0);
    if (!isset($validPupils[$pid])) leave_json_error(400, "Note row " . ($i + 1) . ": that child is not in your class.");
    if (!in_array($n['skill_type'] ?? '', $types, true)) leave_json_error(400, "Note row " . ($i + 1) . ": skill_type must be fine or gross.");
    if (mb_strlen(trim((string) ($n['note'] ?? ''))) > 1000) leave_json_error(400, "Note row " . ($i + 1) . ": keep notes under 1000 characters.");
}

$conn->begin_transaction();
try {
    $ratingsSaved = 0;
    if ($ratings) {
        $stmt = $conn->prepare("
            INSERT INTO motor_assessment (class_id, pupil_id, skill_type, month, rating, updated_by)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE rating = VALUES(rating), class_id = VALUES(class_id), updated_by = VALUES(updated_by)
        ");
        foreach ($ratings as $r) {
            $pid = (int) $r['pupil_id']; $type = $r['skill_type']; $month = $r['month']; $rating = motor_rating_norm((string) $r['rating']);
            $stmt->bind_param('iisssi', $classId, $pid, $type, $month, $rating, $teacherId);
            $stmt->execute();
            motor_write_competency($conn, (int) $classId, $pid, $type, $month, $rating);
            $ratingsSaved++;
        }
        $stmt->close();
    }

    $notesSaved = 0;
    if ($notes) {
        $stmt = $conn->prepare("
            INSERT INTO motor_assessment_notes (class_id, pupil_id, skill_type, note, updated_by)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE note = VALUES(note), class_id = VALUES(class_id), updated_by = VALUES(updated_by)
        ");
        foreach ($notes as $n) {
            $note = trim((string) $n['note']);
            if ($note === '') continue;
            $pid = (int) $n['pupil_id']; $type = $n['skill_type'];
            $stmt->bind_param('iissi', $classId, $pid, $type, $note, $teacherId);
            $stmt->execute();
            $notesSaved++;
        }
        $stmt->close();
    }

    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback();
    throw $e; // reported by the exception handler above
}
$conn->close();

echo json_encode(['status' => 'success', 'ratings_saved' => $ratingsSaved, 'notes_saved' => $notesSaved]);