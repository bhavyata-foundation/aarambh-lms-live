<?php
// =========================================================================
// SAVE CLASSROOM OBSERVATION MARKS — BATCH (from the imported file)
//
// POST { level, marks: [ { pupil_id, month, theme, cg_code, occ, level_mark } ] }
//  - theme / cg_code / occ come from the imported file's own headings (occ = which copy of that CG).
//  - Themes and items are found, or created, for that level and month. Nothing is taken from the server's list.
//  - level_mark: E / P / A. A blank cell is never sent (it stays unmarked).
// Logged-in teacher only, her own children only, all or nothing.
// =========================================================================
session_start();
header('Content-Type: application/json; charset=utf-8');
set_exception_handler(function ($e) {
    error_log('save_observation_marks_batch: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'The server could not save this import: ' . $e->getMessage() . ' Nothing was saved.']);
    exit;
});
$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocal = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocal && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
if (($_SESSION['role'] ?? $devRole) !== 'teacher') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}
function obs_fail($code, $message) { http_response_code($code); echo json_encode(['status' => 'error', 'message' => $message]); exit; }

$input = json_decode(file_get_contents('php://input'), true);
$marks = is_array($input['marks'] ?? null) ? $input['marks'] : null;
if ($marks === null) obs_fail(400, 'marks is required.');
if (count($marks) === 0) { echo json_encode(['status' => 'success', 'saved' => 0, 'cleared' => 0]); exit; }
if (count($marks) > 5000) obs_fail(400, 'Too many marks in one save (more than 5000).');
$level = trim((string) ($input['level'] ?? ''));
if ($level === '') obs_fail(400, 'The class level is missing. Nothing was saved.');

$raw = [];
foreach ($marks as $i => $m) {
    $pupilId = filter_var($m['pupil_id'] ?? null, FILTER_VALIDATE_INT);
    $month   = substr(trim((string) ($m['month'] ?? '')), 0, 20);
    $theme   = substr(trim((string) ($m['theme'] ?? '')), 0, 200);
    $cg      = substr(trim((string) ($m['cg_code'] ?? '')), 0, 20);
    $occ     = max(1, (int) ($m['occ'] ?? 1));
    $lvl     = $m['level_mark'] ?? null;
    if (!$pupilId || $month === '' || $theme === '' || $cg === '') obs_fail(400, 'Mark ' . ($i + 1) . ': pupil, month, theme and CG are all required.');
    if (!in_array($lvl, ['E', 'P', 'A'], true)) obs_fail(400, 'Mark ' . ($i + 1) . ': level_mark must be E, P or A (blank cells are not sent).');
    $raw[] = [$pupilId, $month, $theme, $cg, $occ, $lvl];
}

require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../users/teacher_auth.php';
$teacherId = current_teacher_id();
$conn = get_db_connection();

$stmt = $conn->prepare('SELECT p.id FROM pupils p JOIN classes c ON c.id = p.class_id WHERE c.teacher_user_id = ?');
$stmt->bind_param('i', $teacherId); $stmt->execute();
$mine = [];
foreach ($stmt->get_result()->fetch_all(MYSQLI_NUM) as $r) $mine[(int) $r[0]] = true;
$stmt->close();
foreach ($raw as [$pupilId]) {
    if (!isset($mine[$pupilId])) { $conn->close(); obs_fail(403, 'A child in this file is not in your class (pupil ' . $pupilId . '). Nothing was saved.'); }
}

$conn->query("CREATE TABLE IF NOT EXISTS observation_themes (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(200) NOT NULL, level VARCHAR(40) NOT NULL, month_scheduled VARCHAR(20) NOT NULL, display_order INT NOT NULL DEFAULT 0, UNIQUE KEY uq_theme (level, month_scheduled, name))");
$conn->query("CREATE TABLE IF NOT EXISTS observation_items (id INT AUTO_INCREMENT PRIMARY KEY, theme_id INT NOT NULL, cg_code VARCHAR(20) NOT NULL, item_order INT NOT NULL DEFAULT 1, UNIQUE KEY uq_item (theme_id, cg_code, item_order))");

$themeCache = []; $itemCache = [];
function theme_id_for($conn, $level, $month, $name, &$cache) {
    $k = $month . '|' . $name;
    if (isset($cache[$k])) return $cache[$k];
    $f = $conn->prepare('SELECT id FROM observation_themes WHERE level = ? AND month_scheduled = ? AND name = ? LIMIT 1');
    $f->bind_param('sss', $level, $month, $name); $f->execute();
    $row = $f->get_result()->fetch_row(); $f->close();
    if ($row) return $cache[$k] = (int) $row[0];
    $o = $conn->prepare('SELECT COALESCE(MAX(display_order), 0) + 1 FROM observation_themes WHERE level = ? AND month_scheduled = ?');
    $o->bind_param('ss', $level, $month); $o->execute();
    $order = (int) $o->get_result()->fetch_row()[0]; $o->close();
    $ins = $conn->prepare('INSERT INTO observation_themes (name, level, month_scheduled, display_order) VALUES (?, ?, ?, ?)');
    $ins->bind_param('sssi', $name, $level, $month, $order); $ins->execute();
    $id = (int) $conn->insert_id; $ins->close();
    return $cache[$k] = $id;
}
function item_id_for($conn, $themeId, $cg, $occ, &$cache) {
    $k = $themeId . '|' . $cg . '|' . $occ;
    if (isset($cache[$k])) return $cache[$k];
    $f = $conn->prepare('SELECT id FROM observation_items WHERE theme_id = ? AND cg_code = ? AND item_order = ? LIMIT 1');
    $f->bind_param('isi', $themeId, $cg, $occ); $f->execute();
    $row = $f->get_result()->fetch_row(); $f->close();
    if ($row) return $cache[$k] = (int) $row[0];
    $ins = $conn->prepare('INSERT INTO observation_items (theme_id, cg_code, item_order) VALUES (?, ?, ?)');
    $ins->bind_param('isi', $themeId, $cg, $occ); $ins->execute();
    $id = (int) $conn->insert_id; $ins->close();
    return $cache[$k] = $id;
}

$resolved = [];
foreach ($raw as [$pupilId, $month, $theme, $cg, $occ, $lvl]) {
    $tid = theme_id_for($conn, $level, $month, $theme, $themeCache);
    $iid = item_id_for($conn, $tid, $cg, $occ, $itemCache);
    $resolved['o:' . $pupilId . ':' . $iid] = [$pupilId, $iid, $lvl];
}

$put = $conn->prepare('INSERT INTO observation_assessment (pupil_id, observation_item_id, level_mark, teacher_user_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE level_mark = VALUES(level_mark), teacher_user_id = VALUES(teacher_user_id)');
$saved = 0;
$conn->begin_transaction();
try {
    foreach (array_values($resolved) as [$pupilId, $iid, $lvl]) {
        $put->bind_param('iisi', $pupilId, $iid, $lvl, $teacherId); $put->execute(); $saved++;
    }
    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback();
    error_log('save_observation_marks_batch failed: ' . $e->getMessage());
    $conn->close();
    obs_fail(500, 'The observation marks could not be saved (nothing was saved): ' . $e->getMessage());
}
$put->close(); $conn->close();
echo json_encode(['status' => 'success', 'saved' => $saved, 'cleared' => 0]);