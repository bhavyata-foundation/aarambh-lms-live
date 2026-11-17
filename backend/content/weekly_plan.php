<?php
// =========================================================================
// backend/content/weekly_plan.php — the weekly activity plans, as changed by
// the superadmin or a supervisor (on top of the plans in js/weeks/weekN.js)
// -------------------------------------------------------------------------
// GET                        → { status, can_edit, changes: [{week, day, area, text, by, at}] }
//                              (anyone logged in: teachers read the changes)
// POST { action: 'save',  week, day, area, text }  → superadmin / supervisor
// POST { action: 'reset', week, day, area }        → back to the original plan
//   day  mon … sat · area  an activity area key (numeracy …), or '_topic' = the day's topic
// Every change is written to content_changes. The table is created on first use.
// =========================================================================
require_once __DIR__ . '/content_common.php';
content_require_login();
$conn = get_db_connection();
$conn->query("CREATE TABLE IF NOT EXISTS content_weekly_plan (
  id INT AUTO_INCREMENT PRIMARY KEY, week INT NOT NULL, day VARCHAR(3) NOT NULL, area VARCHAR(30) NOT NULL,
  text VARCHAR(500) NOT NULL, updated_by INT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY one_cell (week, day, area)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$role = $_SESSION['role'] ?? '';
$canEdit = in_array($role, ['superadmin', 'supervisor'], true);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $res = $conn->query("SELECT p.week, p.day, p.area, p.text, p.updated_at, COALESCE(u.name, '') AS by_name
                           FROM content_weekly_plan p LEFT JOIN users u ON u.id = p.updated_by ORDER BY p.week, p.day, p.area");
    $out = [];
    while ($r = $res->fetch_assoc()) $out[] = ['week' => (int) $r['week'], 'day' => $r['day'], 'area' => $r['area'], 'text' => $r['text'], 'by' => $r['by_name'], 'at' => $r['updated_at']];
    content_ok(['can_edit' => $canEdit, 'changes' => $out]);
}

if (!$canEdit) content_fail(403, 'Only a superadmin or a supervisor can change the weekly plans.');
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$action = (string) ($in['action'] ?? 'save');
$week = filter_var($in['week'] ?? null, FILTER_VALIDATE_INT);
$day = strtolower(trim((string) ($in['day'] ?? '')));
$area = trim((string) ($in['area'] ?? ''));
if (!$week || $week < 1 || $week > 60) content_fail(400, 'Choose a week.');
if (!in_array($day, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'], true)) content_fail(400, 'Choose a day.');
if (!preg_match('/^(_topic|[a-z][a-z0-9_]{1,29})$/', $area)) content_fail(400, 'Unknown activity area.');
$ref = "wk$week/$day/$area";

$st = $conn->prepare('SELECT text FROM content_weekly_plan WHERE week = ? AND day = ? AND area = ?');
$st->bind_param('iss', $week, $day, $area); $st->execute(); $before = $st->get_result()->fetch_assoc(); $st->close();

if ($action === 'reset') {
    $st = $conn->prepare('DELETE FROM content_weekly_plan WHERE week = ? AND day = ? AND area = ?');
    $st->bind_param('iss', $week, $day, $area); $st->execute(); $st->close();
    if ($before) content_log($conn, 'weekly_plan', $ref, 'reset', $before, null);
    content_ok(['week' => $week, 'day' => $day, 'area' => $area, 'reset' => true]);
}
if ($action !== 'save') content_fail(400, 'Unknown action.');
$text = content_text($in['text'] ?? '', 'The activity', 500);
$uid = (int) $_SESSION['user_id'];
$st = $conn->prepare('INSERT INTO content_weekly_plan (week, day, area, text, updated_by) VALUES (?, ?, ?, ?, ?)
                      ON DUPLICATE KEY UPDATE text = VALUES(text), updated_by = VALUES(updated_by)');
$st->bind_param('isssi', $week, $day, $area, $text, $uid); $st->execute(); $st->close();
content_log($conn, 'weekly_plan', $ref, $before ? 'edit' : 'add', $before, ['text' => $text]);
content_ok(['week' => $week, 'day' => $day, 'area' => $area, 'text' => $text]);
