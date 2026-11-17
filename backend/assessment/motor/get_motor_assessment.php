<?php
// ============================================================
// GET MOTOR ASSESSMENT — every fine & gross motor rating and note
// for the teacher's class.
// File: backend/assessment/motor/get_motor_assessment.php
// GET: class_id
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

$classId = filter_var($_GET['class_id'] ?? null, FILTER_VALIDATE_INT);
if (!$classId) leave_json_error(400, 'class_id is required.');
motor_check_class($conn, $classId, $teacherId);

$ratings = new stdClass(); // pupil_id -> { fine: {June:'G'}, gross: {...} }
$stmt = $conn->prepare("
    SELECT m.pupil_id, m.skill_type, m.month, m.rating
    FROM motor_assessment m
    JOIN pupils p ON p.id = m.pupil_id AND p.active = 1
    WHERE m.class_id = ?
");
$stmt->bind_param('i', $classId);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $pid = (string) $row['pupil_id']; $type = $row['skill_type']; $month = $row['month'];
    if (!isset($ratings->$pid)) $ratings->$pid = new stdClass();
    if (!isset($ratings->$pid->$type)) $ratings->$pid->$type = new stdClass();
    // stored as B / P / A; the Motor screen works with R / Y / G (R = B, Y = P, G = A)
    $ratings->$pid->$type->$month = ['A' => 'G', 'P' => 'Y', 'B' => 'R'][$row['rating']] ?? $row['rating'];
}
$stmt->close();

$notes = new stdClass(); // pupil_id -> { fine: '...', gross: '...' }
$stmt = $conn->prepare("SELECT pupil_id, skill_type, note FROM motor_assessment_notes WHERE class_id = ?");
$stmt->bind_param('i', $classId);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $pid = (string) $row['pupil_id']; $type = $row['skill_type'];
    if (!isset($notes->$pid)) $notes->$pid = new stdClass();
    $notes->$pid->$type = $row['note'];
}
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'ratings' => $ratings, 'notes' => $notes], JSON_UNESCAPED_UNICODE);