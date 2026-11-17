<?php
// Curriculum master: remove one item (supervisor and superadmin only).
session_start();
header('Content-Type: application/json');
$role = $_SESSION['role'] ?? null;
if (!in_array($role, ['supervisor', 'superadmin'], true)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int) ($in['id'] ?? 0);
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'id is required.']);
    exit;
}
require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();
$stmt = $conn->prepare('DELETE FROM curriculum_items WHERE id = ?');
$stmt->bind_param('i', $id);
$stmt->execute();
$stmt->close();
$conn->close();
echo json_encode(['status' => 'success']);
