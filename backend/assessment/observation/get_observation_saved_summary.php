<?php
// Saved classroom observation marks for one level and month, counted per activity (for the CG summary).
// Only the teacher's own children. Returns E / P / A counts per activity.
session_start();
header('Content-Type: application/json; charset=utf-8');
$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocal = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocal && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
if (($_SESSION['role'] ?? $devRole) !== 'teacher') { http_response_code(401); echo json_encode(['status' => 'error', 'message' => 'Not authorized.']); exit; }
$level = trim((string) ($_GET['level'] ?? ''));
$month = trim((string) ($_GET['month'] ?? ''));
if ($level === '' || $month === '') { echo json_encode(['status' => 'success', 'rows' => []]); exit; }
require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../users/teacher_auth.php';
$teacherId = current_teacher_id();
$conn = get_db_connection();
$sql = "SELECT t.name AS theme, i.cg_code, i.item_order, a.level_mark, COUNT(*) AS n
        FROM observation_assessment a
        JOIN observation_items i ON i.id = a.observation_item_id
        JOIN observation_themes t ON t.id = i.theme_id
        JOIN pupils p ON p.id = a.pupil_id
        JOIN classes c ON c.id = p.class_id
        WHERE c.teacher_user_id = ? AND t.level = ? AND t.month_scheduled = ?
        GROUP BY t.name, i.cg_code, i.item_order, a.level_mark";
$st = $conn->prepare($sql);
$st->bind_param('iss', $teacherId, $level, $month);
$st->execute();
$res = $st->get_result();
$acc = [];
while ($r = $res->fetch_assoc()) {
    $k = $r['theme'] . '|' . $r['cg_code'] . '|' . $r['item_order'];
    if (!isset($acc[$k])) $acc[$k] = ['theme' => $r['theme'], 'cg_code' => $r['cg_code'], 'item_order' => (int) $r['item_order'], 'E' => 0, 'P' => 0, 'A' => 0];
    if (in_array($r['level_mark'], ['E', 'P', 'A'], true)) $acc[$k][$r['level_mark']] += (int) $r['n'];
}
$st->close(); $conn->close();
echo json_encode(['status' => 'success', 'rows' => array_values($acc)]);
