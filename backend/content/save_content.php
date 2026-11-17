<?php
// =========================================================================
// backend/content/save_content.php — change the activities (SUPERADMIN ONLY)
// -------------------------------------------------------------------------
// POST JSON { action, … }. The safe rules: wording / CG can always change;
// new ones are ADDED; old ones are RETIRED (kept for the records, hidden from
// new entry) — never deleted. A Pre-Test activity keeps its position for good,
// because marks are saved under it. Every change is logged in content_changes.
//
//   pretest_update   { level, position, type?, activity?, cg?, page? }
//   pretest_add      { level, type, activity, cg, page? }        → the next position
//   pretest_retire   { level, position }      pretest_restore { level, position }
//   theme_update     { id, name?, month? }
//   theme_add        { level, month, name }
//   theme_retire     { id }                   theme_restore   { id }
//   item_update      { id, cg_code }
//   item_add         { theme_id, cg_code }
//   item_retire      { id }                   item_restore    { id }
// =========================================================================
require_once __DIR__ . '/content_common.php';
content_require_superadmin();
if($_SERVER['REQUEST_METHOD'] !== 'POST') content_fail(405, 'Use POST.');
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$action = (string) ($in['action'] ?? '');
$conn = get_db_connection();
$by = (int) ($_SESSION['user_id'] ?? 0);

function pretest_row($conn, $level, $pos){
    $st = $conn->prepare('SELECT position, type, activity, cg, page, retired FROM content_pretest_activities WHERE level = ? AND position = ?');
    $st->bind_param('si', $level, $pos); $st->execute(); $r = $st->get_result()->fetch_assoc(); $st->close();
    if(!$r) content_fail(404, 'No Pre-Test activity ' . $pos . ' for ' . $level . '.');
    $r['position'] = (int) $r['position']; $r['retired'] = (bool) $r['retired']; return $r;
}
function one_row($conn, $sql, $id, $what){
    $st = $conn->prepare($sql); $st->bind_param('i', $id); $st->execute(); $r = $st->get_result()->fetch_assoc(); $st->close();
    if(!$r) content_fail(404, 'No such ' . $what . '.'); return $r;
}
$type = fn($v) => in_array($v, ['Worksheet', 'Classroom'], true) ? $v : content_fail(400, 'Type must be Worksheet or Classroom.');
$page = fn($v) => ($v = trim((string) $v)) === '' ? '—' : (content_len($v) > 20 ? content_fail(400, 'Page is too long.') : $v);

switch($action){
  // ---------------- Pre-Test ----------------
  case 'pretest_update': {
    $level = content_level($in['level'] ?? ''); $pos = (int) ($in['position'] ?? 0);
    $old = pretest_row($conn, $level, $pos); $new = $old;
    if(array_key_exists('type', $in)) $new['type'] = $type($in['type']);
    if(array_key_exists('activity', $in)) $new['activity'] = content_text($in['activity'], 'Activity');
    if(array_key_exists('cg', $in)) $new['cg'] = content_pretest_cg($in['cg']);
    if(array_key_exists('page', $in)) $new['page'] = $page($in['page']);
    $st = $conn->prepare('UPDATE content_pretest_activities SET type = ?, activity = ?, cg = ?, page = ?, updated_by = ? WHERE level = ? AND position = ?');
    $st->bind_param('ssssisi', $new['type'], $new['activity'], $new['cg'], $new['page'], $by, $level, $pos); $st->execute(); $st->close();
    content_log($conn, 'pretest', $level . ' #' . $pos, 'update', $old, $new);
    content_ok(['activity' => $new]);
  }
  case 'pretest_add': {
    $level = content_level($in['level'] ?? '');
    $row = ['type' => $type($in['type'] ?? ''), 'activity' => content_text($in['activity'] ?? '', 'Activity'), 'cg' => content_pretest_cg($in['cg'] ?? ''), 'page' => $page($in['page'] ?? '')];
    $conn->begin_transaction();
    $st = $conn->prepare('SELECT COALESCE(MAX(position), 0) + 1 FROM content_pretest_activities WHERE level = ? FOR UPDATE');
    $st->bind_param('s', $level); $st->execute(); $pos = (int) $st->get_result()->fetch_row()[0]; $st->close();
    $st = $conn->prepare('INSERT INTO content_pretest_activities (level, position, type, activity, cg, page, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $st->bind_param('sissssi', $level, $pos, $row['type'], $row['activity'], $row['cg'], $row['page'], $by); $st->execute(); $st->close();
    $conn->commit();
    $row['position'] = $pos; $row['retired'] = false;
    content_log($conn, 'pretest', $level . ' #' . $pos, 'add', null, $row);
    content_ok(['activity' => $row]);
  }
  case 'pretest_retire': case 'pretest_restore': {
    $level = content_level($in['level'] ?? ''); $pos = (int) ($in['position'] ?? 0);
    $old = pretest_row($conn, $level, $pos); $flag = $action === 'pretest_retire' ? 1 : 0;
    $st = $conn->prepare('UPDATE content_pretest_activities SET retired = ?, updated_by = ? WHERE level = ? AND position = ?');
    $st->bind_param('iisi', $flag, $by, $level, $pos); $st->execute(); $st->close();
    content_log($conn, 'pretest', $level . ' #' . $pos, $flag ? 'retire' : 'restore', $old, array_merge($old, ['retired' => (bool) $flag]));
    content_ok(['position' => $pos, 'retired' => (bool) $flag]);
  }
  // ---------------- Observation themes ----------------
  case 'theme_update': {
    $id = (int) ($in['id'] ?? 0);
    $old = one_row($conn, 'SELECT id, level, month_scheduled AS month, name, retired FROM observation_themes WHERE id = ?', $id, 'theme'); $new = $old;
    if(array_key_exists('name', $in)) $new['name'] = content_text($in['name'], 'Theme name', 150);
    if(array_key_exists('month', $in)) $new['month'] = content_month($in['month']);
    $st = $conn->prepare('UPDATE observation_themes SET name = ?, month_scheduled = ? WHERE id = ?');
    $st->bind_param('ssi', $new['name'], $new['month'], $id); $st->execute(); $st->close();
    content_log($conn, 'observation_theme', 'theme ' . $id, 'update', $old, $new);
    content_ok(['theme' => $new]);
  }
  case 'theme_add': {
    $level = content_level($in['level'] ?? ''); $month = content_month($in['month'] ?? ''); $name = content_text($in['name'] ?? '', 'Theme name', 150);
    $st = $conn->prepare('SELECT COALESCE(MAX(display_order), 0) + 1 FROM observation_themes WHERE level = ? AND month_scheduled = ?');
    $st->bind_param('ss', $level, $month); $st->execute(); $order = (int) $st->get_result()->fetch_row()[0]; $st->close();
    $st = $conn->prepare('INSERT INTO observation_themes (name, level, month_scheduled, display_order) VALUES (?, ?, ?, ?)');
    $st->bind_param('sssi', $name, $level, $month, $order); $st->execute(); $id = $st->insert_id; $st->close();
    $row = ['id' => $id, 'level' => $level, 'month' => $month, 'name' => $name];
    content_log($conn, 'observation_theme', 'theme ' . $id, 'add', null, $row);
    content_ok(['theme' => $row]);
  }
  case 'theme_retire': case 'theme_restore': {
    $id = (int) ($in['id'] ?? 0); $flag = $action === 'theme_retire' ? 1 : 0;
    $old = one_row($conn, 'SELECT id, level, month_scheduled AS month, name, retired FROM observation_themes WHERE id = ?', $id, 'theme');
    $st = $conn->prepare('UPDATE observation_themes SET retired = ? WHERE id = ?'); $st->bind_param('ii', $flag, $id); $st->execute(); $st->close();
    content_log($conn, 'observation_theme', 'theme ' . $id, $flag ? 'retire' : 'restore', $old, null);
    content_ok(['id' => $id, 'retired' => (bool) $flag]);
  }
  // ---------------- Observation items (competencies) ----------------
  case 'item_update': {
    $id = (int) ($in['id'] ?? 0); $code = content_competency($in['cg_code'] ?? '');
    $old = one_row($conn, 'SELECT id, theme_id, cg_code, retired FROM observation_items WHERE id = ?', $id, 'competency');
    $st = $conn->prepare('UPDATE observation_items SET cg_code = ? WHERE id = ?'); $st->bind_param('si', $code, $id); $st->execute(); $st->close();
    content_log($conn, 'observation_item', 'item ' . $id, 'update', $old, array_merge($old, ['cg_code' => $code]));
    content_ok(['id' => $id, 'cg_code' => $code]);
  }
  case 'item_add': {
    $theme = (int) ($in['theme_id'] ?? 0); $code = content_competency($in['cg_code'] ?? '');
    one_row($conn, 'SELECT id FROM observation_themes WHERE id = ?', $theme, 'theme');
    $st = $conn->prepare('SELECT COALESCE(MAX(item_order), 0) + 1 FROM observation_items WHERE theme_id = ?');
    $st->bind_param('i', $theme); $st->execute(); $order = (int) $st->get_result()->fetch_row()[0]; $st->close();
    $st = $conn->prepare('INSERT INTO observation_items (theme_id, cg_code, item_order) VALUES (?, ?, ?)');
    $st->bind_param('isi', $theme, $code, $order); $st->execute(); $id = $st->insert_id; $st->close();
    content_log($conn, 'observation_item', 'item ' . $id, 'add', null, ['theme_id' => $theme, 'cg_code' => $code]);
    content_ok(['id' => $id, 'cg_code' => $code, 'theme_id' => $theme]);
  }
  case 'item_retire': case 'item_restore': {
    $id = (int) ($in['id'] ?? 0); $flag = $action === 'item_retire' ? 1 : 0;
    $old = one_row($conn, 'SELECT id, theme_id, cg_code, retired FROM observation_items WHERE id = ?', $id, 'competency');
    $st = $conn->prepare('UPDATE observation_items SET retired = ? WHERE id = ?'); $st->bind_param('ii', $flag, $id); $st->execute(); $st->close();
    content_log($conn, 'observation_item', 'item ' . $id, $flag ? 'retire' : 'restore', $old, null);
    content_ok(['id' => $id, 'retired' => (bool) $flag]);
  }
  default: content_fail(400, 'Unknown action.');
}
