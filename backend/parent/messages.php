<?php
// Parent <-> class-teacher thread, one thread per child.
//   GET  ?pupil_id=N            -> messages (marks the other side's as read)
//   POST {pupil_id, body}       -> send
// Access: a parent linked to the child, or the teacher of the child's class.
session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');
set_exception_handler(function ($e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error.']);
    exit;
});

function fail($code, $msg) {
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $msg]);
    exit;
}

$role = $_SESSION['role'] ?? '';
$uid = (int) ($_SESSION['user_id'] ?? 0);
if (!$uid || !in_array($role, ['parent', 'teacher'], true)) fail(401, 'Not authorized.');

$in = $_SERVER['REQUEST_METHOD'] === 'POST' ? (json_decode(file_get_contents('php://input'), true) ?: []) : $_GET;
$pupilId = (int) ($in['pupil_id'] ?? 0);
if ($pupilId <= 0) fail(400, 'pupil_id is required.');

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

if ($role === 'parent') {
    $c = $conn->prepare('SELECT 1 FROM parent_children WHERE parent_user_id = ? AND pupil_id = ?');
} else {
    $c = $conn->prepare('SELECT 1 FROM pupils p JOIN classes c ON c.id = p.class_id WHERE c.teacher_user_id = ? AND p.id = ?');
}
$c->bind_param('ii', $uid, $pupilId);
$c->execute();
if (!$c->get_result()->fetch_row()) fail(403, 'You do not have access to this conversation.');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = trim((string) ($in['body'] ?? ''));
    if ($body === '') fail(400, 'Message is empty.');
    if (mb_strlen($body) > 1000) fail(400, 'Message is too long (1000 characters at most).');
    $ins = $conn->prepare('INSERT INTO parent_messages (pupil_id, sender_user_id, sender_role, body) VALUES (?, ?, ?, ?)');
    $ins->bind_param('iiss', $pupilId, $uid, $role, $body);
    $ins->execute();
    echo json_encode(['status' => 'success']);
    exit;
}

$mark = $conn->prepare('UPDATE parent_messages SET read_at = NOW() WHERE pupil_id = ? AND sender_role <> ? AND read_at IS NULL');
$mark->bind_param('is', $pupilId, $role);
$mark->execute();

$q = $conn->prepare(
    'SELECT m.id, m.sender_role, m.body, m.created_at, u.name AS sender_name
       FROM parent_messages m LEFT JOIN users u ON u.id = m.sender_user_id
      WHERE m.pupil_id = ? ORDER BY m.id ASC LIMIT 200'
);
$q->bind_param('i', $pupilId);
$q->execute();
echo json_encode(['status' => 'success', 'my_role' => $role, 'messages' => $q->get_result()->fetch_all(MYSQLI_ASSOC)]);