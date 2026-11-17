<?php
// Super Admin: change an account's name, email, role and/or password (superadmin only).
// Passwords are stored with password_hash, the same way login.php checks them with password_verify.
session_start();
header('Content-Type: application/json; charset=utf-8');
if (!in_array($_SESSION['role'] ?? null, ['superadmin', 'admin'], true)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$id    = (int) ($in['id'] ?? 0);
$name  = trim((string) ($in['name'] ?? ''));
$email = strtolower(trim((string) ($in['email'] ?? '')));
$role  = trim((string) ($in['role'] ?? ''));
$pass  = (string) ($in['password'] ?? '');

if ($id <= 0) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Account id is required.']); exit; }
if ($name === '') { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Name cannot be empty.']); exit; }
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Enter a valid email address.']); exit; }
if (!in_array($role, ['teacher', 'supervisor', 'superadmin', 'parent'], true)) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'Unknown role.']); exit; }
if ($pass !== '' && strlen($pass) < 6) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'A new password must be at least 6 characters.']); exit; }

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$dup = $conn->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
$dup->bind_param('si', $email, $id);
$dup->execute();
$taken = $dup->get_result()->fetch_assoc();
$dup->close();
if ($taken) { $conn->close(); http_response_code(409); echo json_encode(['status' => 'error', 'message' => 'Another account already uses that email.']); exit; }

if ($pass !== '') {
    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $stmt = $conn->prepare('UPDATE users SET name = ?, email = ?, role = ?, password_hash = ? WHERE id = ?');
    $stmt->bind_param('ssssi', $name, $email, $role, $hash, $id);
} else {
    $stmt = $conn->prepare('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?');
    $stmt->bind_param('sssi', $name, $email, $role, $id);
}
$stmt->execute();
$changed = $stmt->affected_rows;
$stmt->close();
$conn->close();
if ($changed < 0) { http_response_code(500); echo json_encode(['status' => 'error', 'message' => 'Could not save.']); exit; }
echo json_encode(['status' => 'success', 'password_changed' => $pass !== '']);
