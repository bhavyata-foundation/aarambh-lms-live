<?php
// ============================================================
// CANCEL LEAVE — teacher withdraws her own request. Only while it
// is still pending; an approved leave is already in the attendance
// record and has to be handled by the approvers.
// File: backend/teacher_leave/cancel_leave.php
// POST JSON: { leave_id }
// ============================================================

session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');
set_exception_handler(function($e){
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error.']);
    exit;
});

require_once __DIR__ . '/leave_helpers.php';
if (leave_effective_role() !== 'teacher') leave_json_error(401, 'Not authorized.');

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$leaveId = filter_var($input['leave_id'] ?? null, FILTER_VALIDATE_INT);
if (!$leaveId) leave_json_error(400, 'leave_id is required.');

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();
$teacherId = leave_user_id($conn, 'teacher');

$stmt = $conn->prepare("UPDATE teacher_leave_requests SET status = 'cancelled' WHERE id = ? AND teacher_user_id = ? AND status = 'pending'");
$stmt->bind_param('ii', $leaveId, $teacherId);
$stmt->execute();
$affected = $stmt->affected_rows;
$stmt->close();
$conn->close();

if ($affected === 0) leave_json_error(409, 'Only a pending request can be cancelled.');
echo json_encode(['status' => 'success']);