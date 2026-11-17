<?php
// Curriculum master: list the items for a level and term (supervisor and superadmin only).
session_start();
header('Content-Type: application/json');
$role = $_SESSION['role'] ?? null;
if (!in_array($role, ['supervisor', 'superadmin'], true)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}
$level = $_GET['level'] ?? 'Sr KG';
$term  = $_GET['term'] ?? 'TERM_1';
require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();
$stmt = $conn->prepare('SELECT id, level, term, month, assessment, item, page, cg_number, competency_code, sort_order FROM curriculum_items WHERE level = ? AND term = ? ORDER BY sort_order, id');
$stmt->bind_param('ss', $level, $term);
$stmt->execute();
$res = $stmt->get_result();
$items = [];
while ($row = $res->fetch_assoc()) {
    $row['id'] = (int) $row['id'];
    $row['cg_number'] = $row['cg_number'] === null ? null : (int) $row['cg_number'];
    $row['sort_order'] = (int) $row['sort_order'];
    $items[] = $row;
}
$stmt->close();
$conn->close();
echo json_encode(['status' => 'success', 'items' => $items]);
