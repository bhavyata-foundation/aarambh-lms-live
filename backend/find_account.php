<?php
// Super Admin: find accounts by name or email (superadmin only).
session_start();
header('Content-Type: application/json; charset=utf-8');
if (!in_array($_SESSION['role'] ?? null, ['superadmin', 'admin'], true)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}
$q = '%' . trim((string) ($_GET['q'] ?? '')) . '%';
require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();
$stmt = $conn->prepare('SELECT id, name, email, role FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY name LIMIT 30');
$stmt->bind_param('ss', $q, $q);
$stmt->execute();
$res = $stmt->get_result();
$rows = [];
while ($r = $res->fetch_assoc()) { $r['id'] = (int) $r['id']; $rows[] = $r; }
$stmt->close();
$conn->close();
echo json_encode(['status' => 'success', 'accounts' => $rows]);
