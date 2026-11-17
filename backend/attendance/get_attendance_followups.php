<?php
// ============================================================
// GET ATTENDANCE FOLLOW-UPS — every follow-up recorded for the
// teacher's class, newest first.
// File: backend/attendance/get_attendance_followups.php
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

$classId = filter_var($_GET['class_id'] ?? null, FILTER_VALIDATE_INT);
if (!$classId) leave_json_error(400, 'class_id is required.');
fu_check_class($conn, $classId, $teacherId);

$stmt = $conn->prepare("
    SELECT f.id, f.pupil_id, f.reason, f.action_type, f.note, f.follow_up_date, f.created_at
    FROM attendance_followups f
    JOIN pupils p ON p.id = f.pupil_id AND p.active = 1
    WHERE f.class_id = ?
    ORDER BY f.follow_up_date DESC, f.id DESC
");
$stmt->bind_param('i', $classId);
$stmt->execute();
$res = $stmt->get_result();
$rows = [];
while ($r = $res->fetch_assoc()) { $r['id'] = (int) $r['id']; $r['pupil_id'] = (int) $r['pupil_id']; $rows[] = $r; }
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'followups' => $rows], JSON_UNESCAPED_UNICODE);