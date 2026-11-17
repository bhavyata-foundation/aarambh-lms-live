<?php
// ============================================================
// GET PENDING LEAVES — for the supervisor or the principal. Lists
// requests still waiting on THIS role's decision.
//   Principal: only teachers whose class is in her school
//              (schools.principal_user_id, same as get_my_school.php).
//   Supervisor: every school — same known limitation as
//              get_pending_approvals.php (no supervisor→school
//              assignment table yet).
// File: backend/teacher_leave/get_pending_leaves.php
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
$role = leave_effective_role();
if (!in_array($role, ['supervisor', 'principal'], true)) leave_json_error(401, 'Not authorized.');

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$base = "
    SELECT lr.id, lr.leave_type, lr.start_date, lr.end_date, lr.working_days, lr.reason, lr.created_at,
           lr.supervisor_status, lr.supervisor_note, lr.principal_status, lr.principal_note,
           u.name AS teacher_name, c.name AS class_name, s.name AS school_name
    FROM teacher_leave_requests lr
    JOIN users u ON u.id = lr.teacher_user_id
    LEFT JOIN classes c ON c.id = lr.class_id
    LEFT JOIN schools s ON s.id = lr.school_id
    WHERE lr.status = 'pending'
";

if ($role === 'principal') {
    $principalId = leave_user_id($conn, 'principal');
    $stmt = $conn->prepare($base . " AND lr.principal_status = 'pending' AND s.principal_user_id = ? ORDER BY lr.start_date ASC");
    $stmt->bind_param('i', $principalId);
} else {
    $stmt = $conn->prepare($base . " AND lr.supervisor_status = 'pending' ORDER BY lr.start_date ASC");
}
$stmt->execute();
$result = $stmt->get_result();
$rows = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = (int) $row['id'];
    $row['working_days'] = (int) $row['working_days'];
    $rows[] = $row;
}
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'role' => $role, 'pending' => $rows], JSON_UNESCAPED_UNICODE);