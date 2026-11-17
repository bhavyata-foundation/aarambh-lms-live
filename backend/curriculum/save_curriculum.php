<?php
// Curriculum master: add or update one item. A competency code must belong to the CG it is filed under.
session_start();
header('Content-Type: application/json');
$role = $_SESSION['role'] ?? null;
if (!in_array($role, ['supervisor', 'superadmin'], true)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$id     = isset($in['id']) && $in['id'] ? (int) $in['id'] : 0;
$level  = trim((string) ($in['level'] ?? ''));
$term   = trim((string) ($in['term'] ?? ''));
$month  = trim((string) ($in['month'] ?? ''));
$assess = trim((string) ($in['assessment'] ?? ''));
$item   = trim((string) ($in['item'] ?? ''));
$page   = trim((string) ($in['page'] ?? ''));
$cg     = isset($in['cg_number']) && $in['cg_number'] !== '' ? (int) $in['cg_number'] : null;
$code   = strtoupper(trim((string) ($in['competency_code'] ?? '')));
$sort   = (int) ($in['sort_order'] ?? 0);
$by     = $_SESSION['user_id'] ?? null;

if ($level === '' || $term === '' || $assess === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Level, term and assessment are required.']);
    exit;
}
if ($cg !== null && ($cg < 1 || $cg > 13)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'CG must be between 1 and 13.']);
    exit;
}
if ($code !== '') {
    if (!preg_match('/^C-(\d+)\.(\d+)$/', $code, $m)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Competency code must look like C-7.1.']);
        exit;
    }
    if ($cg !== null && (int) $m[1] !== $cg) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => "$code belongs to CG-" . (int) $m[1] . ", not CG-$cg."]);
        exit;
    }
    if ($cg === null) { $cg = (int) $m[1]; }
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();
if ($id > 0) {
    $stmt = $conn->prepare('UPDATE curriculum_items SET level=?, term=?, month=?, assessment=?, item=?, page=?, cg_number=?, competency_code=?, sort_order=?, updated_by=? WHERE id=?');
    $stmt->bind_param('ssssssisiii', $level, $term, $month, $assess, $item, $page, $cg, $code, $sort, $by, $id);
} else {
    $stmt = $conn->prepare('INSERT INTO curriculum_items (level, term, month, assessment, item, page, cg_number, competency_code, sort_order, updated_by) VALUES (?,?,?,?,?,?,?,?,?,?)');
    $stmt->bind_param('ssssssisii', $level, $term, $month, $assess, $item, $page, $cg, $code, $sort, $by);
}
$stmt->execute();
$newId = $id > 0 ? $id : $conn->insert_id;
$stmt->close();
$conn->close();
echo json_encode(['status' => 'success', 'id' => (int) $newId]);
