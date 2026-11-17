<?php
// ============================================================
// GET RAISED FLAGS — for the supervisor: every flag raised in the
// last 90 days, newest first, with the teacher's reply if any.
// File: backend/flags/get_raised_flags.php
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
    SELECT f.id, f.state, f.text, f.date_raised, f.due_date, f.status, f.reply_text, f.replied_at,
           t.name AS teacher_name, c.name AS class_name, s.name AS school_name, r.name AS raised_by_name
    FROM teacher_flags f
    JOIN users t ON t.id = f.teacher_user_id
    LEFT JOIN classes c ON c.id = f.class_id
    LEFT JOIN schools s ON s.id = f.school_id
    LEFT JOIN users r ON r.id = f.raised_by_user_id
    WHERE f.date_raised >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
    ORDER BY f.date_raised DESC, f.id DESC
");
$flags = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = (int) $row['id'];
    $flags[] = $row;
}
$conn->close();

echo json_encode(['status' => 'success', 'flags' => $flags], JSON_UNESCAPED_UNICODE);