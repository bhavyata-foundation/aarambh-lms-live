<?php
// ============================================================
// GET FLAG TEACHERS — the teachers a supervisor can raise a flag
// for: every class that has a teacher assigned, with school name.
// Same scope as get_pending_approvals.php (all schools — there is
// no supervisor→school assignment table yet).
// File: backend/flags/get_flag_teachers.php
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

// Same role / user-id / error helpers the leave endpoints use.
require_once __DIR__ . '/../teacher_leave/leave_helpers.php';

if (leave_effective_role() !== 'supervisor') leave_json_error(401, 'Not authorized.');

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$result = $conn->query("
    SELECT u.id AS teacher_user_id, u.name AS teacher_name,
           c.id AS class_id, c.name AS class_name,
           s.id AS school_id, s.name AS school_name
    FROM classes c
    JOIN users u ON u.id = c.teacher_user_id
    LEFT JOIN schools s ON s.id = c.school_id
    ORDER BY s.name, u.name
");
$teachers = [];
while ($row = $result->fetch_assoc()) {
    $row['teacher_user_id'] = (int) $row['teacher_user_id'];
    $row['class_id'] = (int) $row['class_id'];
    $row['school_id'] = $row['school_id'] !== null ? (int) $row['school_id'] : null;
    $teachers[] = $row;
}
$conn->close();

echo json_encode(['status' => 'success', 'teachers' => $teachers], JSON_UNESCAPED_UNICODE);