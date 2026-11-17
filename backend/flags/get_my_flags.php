<?php
// ============================================================
// GET MY FLAGS — every flag raised against the logged-in teacher,
// newest first.
// File: backend/flags/get_my_flags.php
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

if (leave_effective_role() !== 'teacher') leave_json_error(401, 'Not authorized.');

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();
$teacherId = leave_user_id($conn, 'teacher');
if (!$teacherId) { echo json_encode(['status' => 'success', 'flags' => []]); exit; }

$stmt = $conn->prepare("
    SELECT f.id, f.state, f.text, f.date_raised, f.due_date, f.status, f.reply_text, f.replied_at,
           u.name AS raised_by_name
    FROM teacher_flags f
    LEFT JOIN users u ON u.id = f.raised_by_user_id
    WHERE f.teacher_user_id = ?
    ORDER BY f.date_raised DESC, f.id DESC
");
$stmt->bind_param('i', $teacherId);
$stmt->execute();
$result = $stmt->get_result();
$flags = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = (int) $row['id'];
    $flags[] = $row;
}
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'flags' => $flags], JSON_UNESCAPED_UNICODE);