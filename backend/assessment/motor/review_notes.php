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


// TEACHER'S REVIEW NOTES — one note per child per term (GET reads it, POST saves it)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    $pid  = (int) ($in['pupil_id'] ?? 0);
    $term = preg_replace('/[^A-Z_0-9]/', '', strtoupper((string) ($in['term'] ?? '')));
    $note = trim((string) ($in['note'] ?? ''));
    if (!$pid || $term === '') { echo json_encode(['status' => 'error', 'message' => 'pupil and term are required']); exit; }
    if (mb_strlen($note) > 4000) { echo json_encode(['status' => 'error', 'message' => 'note is too long']); exit; }
    $st = $conn->prepare("INSERT INTO teacher_review_notes (class_id, pupil_id, term, note) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE note = VALUES(note), updated_at = NOW()");
    $st->bind_param('iiss', $classId, $pid, $term, $note);
    $st->execute();
    $st->close();
    $conn->close();
    echo json_encode(['status' => 'success']);
    exit;
}
$pid  = (int) ($_GET['pupil_id'] ?? 0);
$term = preg_replace('/[^A-Z_0-9]/', '', strtoupper((string) ($_GET['term'] ?? '')));
$st = $conn->prepare("SELECT note FROM teacher_review_notes WHERE class_id = ? AND pupil_id = ? AND term = ?");
$st->bind_param('iis', $classId, $pid, $term);
$st->execute();
$res = $st->get_result();
$row = $res->fetch_assoc();
$st->close();
$conn->close();
echo json_encode(['status' => 'success', 'note' => $row['note'] ?? '']);
