<?php
// ============================================================
// SAVE MOTOR RATING — one child, one sheet, one month.
//   rating: 'G' | 'Y' | 'R' | null (null clears it)
// File: backend/assessment/motor/save_motor_rating.php
// POST JSON: { class_id, pupil_id, skill_type, month, rating }
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
$classId   = filter_var($input['class_id'] ?? null, FILTER_VALIDATE_INT);
$pupilId   = filter_var($input['pupil_id'] ?? null, FILTER_VALIDATE_INT);
$skillType = $input['skill_type'] ?? '';
$month     = $input['month'] ?? '';
$rating    = $input['rating'] ?? null;

if (!$classId || !$pupilId) leave_json_error(400, 'class_id and pupil_id are required.');
if (!in_array($skillType, ['fine', 'gross'], true)) leave_json_error(400, 'skill_type must be fine or gross.');
if (!in_array($month, ['June', 'July', 'August', 'September', 'October'], true)) leave_json_error(400, 'month must be June to October.');
if ($rating !== null && !in_array($rating, ['G', 'Y', 'R'], true)) leave_json_error(400, 'rating must be G, Y, R or null.');

motor_check_class($conn, $classId, $teacherId);
motor_check_pupil($conn, $pupilId, $classId);

if ($rating === null) {
    $stmt = $conn->prepare("DELETE FROM motor_assessment WHERE pupil_id = ? AND skill_type = ? AND month = ?");
    $stmt->bind_param('iss', $pupilId, $skillType, $month);
} else {
    $stmt = $conn->prepare("
        INSERT INTO motor_assessment (class_id, pupil_id, skill_type, month, rating, updated_by)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE rating = VALUES(rating), class_id = VALUES(class_id), updated_by = VALUES(updated_by)
    ");
    $stmt->bind_param('iisssi', $classId, $pupilId, $skillType, $month, $rating, $teacherId);
}
$stmt->execute();
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'rating' => $rating]);