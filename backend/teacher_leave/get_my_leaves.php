<?php
// ============================================================
// GET MY LEAVES — every leave request of the logged-in teacher,
// newest first, with both approvers' decisions.
// File: backend/teacher_leave/get_my_leaves.php
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

require_once __DIR__ . '/leave_helpers.php';
if (leave_effective_role() !== 'teacher') leave_json_error(401, 'Not authorized.');

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();
$teacherId = leave_user_id($conn, 'teacher');
if (!$teacherId) { echo json_encode(['status' => 'success', 'leaves' => []]); exit; }

$stmt = $conn->prepare("
    SELECT lr.id, lr.leave_type, lr.start_date, lr.end_date, lr.working_days, lr.reason, lr.status,
           lr.supervisor_status, lr.supervisor_note, lr.supervisor_decided_at,
           lr.principal_status, lr.principal_note, lr.principal_decided_at, lr.created_at,
           su.name AS supervisor_name, pu.name AS principal_name
    FROM teacher_leave_requests lr
    LEFT JOIN users su ON su.id = lr.supervisor_user_id
    LEFT JOIN users pu ON pu.id = lr.principal_user_id
    WHERE lr.teacher_user_id = ?
    ORDER BY lr.start_date DESC, lr.id DESC
");
$stmt->bind_param('i', $teacherId);
$stmt->execute();
$result = $stmt->get_result();
$leaves = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = (int) $row['id'];
    $row['working_days'] = (int) $row['working_days'];
    $leaves[] = $row;
}
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'leaves' => $leaves], JSON_UNESCAPED_UNICODE);