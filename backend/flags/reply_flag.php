<?php
// ============================================================
// REPLY TO A FLAG — teacher replies to her own open Concern or
// For-escalation flag. Observations need no reply.
// File: backend/flags/reply_flag.php
// POST JSON: { flag_id, reply_text }
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

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$flagId = filter_var($input['flag_id'] ?? null, FILTER_VALIDATE_INT);
$reply  = trim((string)($input['reply_text'] ?? ''));
if (!$flagId) leave_json_error(400, 'flag_id is required.');
if ($reply === '') leave_json_error(400, 'Write a reply first.');

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();
$teacherId = leave_user_id($conn, 'teacher');

$stmt = $conn->prepare("
    UPDATE teacher_flags
    SET status = 'replied', reply_text = ?, replied_at = NOW()
    WHERE id = ? AND teacher_user_id = ? AND status = 'open' AND state <> 'observation'
");
$stmt->bind_param('sii', $reply, $flagId, $teacherId);
$stmt->execute();
$affected = $stmt->affected_rows;
$stmt->close();
$conn->close();

if ($affected === 0) leave_json_error(409, 'This flag is not open for a reply (already replied, an observation, or not yours).');
echo json_encode(['status' => 'success']);