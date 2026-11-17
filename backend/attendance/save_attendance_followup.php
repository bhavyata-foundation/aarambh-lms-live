<?php
// ============================================================
// SAVE ATTENDANCE FOLLOW-UP — records one action taken for a child
// on the follow-up list (called home, home visit, message …).
// File: backend/attendance/save_attendance_followup.php
// POST JSON: { class_id, pupil_id, action_type, note, follow_up_date, reason }
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

require_once __DIR__ . '/../teacher_leave/leave_helpers.php';
if (leave_effective_role() !== 'teacher') leave_json_error(401, 'Not authorized.');

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();
$teacherId = leave_user_id($conn, 'teacher');
if (!$teacherId) leave_json_error(401, 'Could not determine teacher.');

function fu_check_class($conn, $classId, $teacherId){
    $stmt = $conn->prepare("SELECT id FROM classes WHERE id = ? AND teacher_user_id = ? LIMIT 1");
    $stmt->bind_param('ii', $classId, $teacherId);
    $stmt->execute();
    $ok = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$ok) leave_json_error(403, 'This class does not belong to the logged-in teacher.');
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$classId = filter_var($input['class_id'] ?? null, FILTER_VALIDATE_INT);
$pupilId = filter_var($input['pupil_id'] ?? null, FILTER_VALIDATE_INT);
$action  = trim((string) ($input['action_type'] ?? ''));
$note    = trim((string) ($input['note'] ?? ''));
$date    = (string) ($input['follow_up_date'] ?? '');
$reason  = in_array($input['reason'] ?? '', ['below70', 'streak'], true) ? $input['reason'] : '';

if (!$classId || !$pupilId) leave_json_error(400, 'class_id and pupil_id are required.');
if ($action === '' || mb_strlen($action) > 80) leave_json_error(400, 'Choose what was done.');
if (mb_strlen($note) > 2000) leave_json_error(400, 'Keep the note under 2000 characters.');
$d = DateTime::createFromFormat('Y-m-d', $date);
if (!$d || $d->format('Y-m-d') !== $date) leave_json_error(400, 'Pick a valid date.');
if ($date > date('Y-m-d')) leave_json_error(400, 'The date can\'t be in the future.');

fu_check_class($conn, $classId, $teacherId);
$stmt = $conn->prepare("SELECT id FROM pupils WHERE id = ? AND class_id = ? AND active = 1 LIMIT 1");
$stmt->bind_param('ii', $pupilId, $classId);
$stmt->execute();
$ok = (bool) $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$ok) leave_json_error(403, 'This child is not in your class.');

$stmt = $conn->prepare("INSERT INTO attendance_followups (class_id, pupil_id, reason, action_type, note, follow_up_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param('iissssi', $classId, $pupilId, $reason, $action, $note, $date, $teacherId);
$stmt->execute();
$newId = $stmt->insert_id;
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'id' => $newId]);