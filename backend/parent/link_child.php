<?php
// Superadmin only: link a parent login to a child.  POST JSON {parent_email, pupil_id}
session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');
set_exception_handler(function ($e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error.']);
    exit;
});

if (($_SESSION['role'] ?? '') !== 'superadmin') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$email = strtolower(trim((string) ($in['parent_email'] ?? '')));
$pupilId = (int) ($in['pupil_id'] ?? 0);
if ($email === '' || $pupilId <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'parent_email and pupil_id are required.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$u = $conn->prepare("SELECT id FROM users WHERE LOWER(email) = ? AND role = 'parent' LIMIT 1");
$u->bind_param('s', $email);
$u->execute();
$parent = $u->get_result()->fetch_assoc();
$p = $conn->prepare('SELECT id FROM pupils WHERE id = ? AND active = 1');
$p->bind_param('i', $pupilId);
$p->execute();
$pupil = $p->get_result()->fetch_assoc();
if (!$parent || !$pupil) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => !$parent ? 'No parent account with that email.' : 'Child not found.']);
    exit;
}

$pid = (int) $parent['id'];
$ins = $conn->prepare('INSERT IGNORE INTO parent_children (parent_user_id, pupil_id) VALUES (?, ?)');
$ins->bind_param('ii', $pid, $pupilId);
$ins->execute();
echo json_encode(['status' => 'success', 'message' => 'Linked.']);