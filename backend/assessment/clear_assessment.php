<?php
// =========================================================================
// CLEAR ASSESSMENT — delete (and undo) one tab's marks for ONE class
// -------------------------------------------------------------------------
// POST JSON { action: 'count' | 'delete' | 'undo', type, month?, term?, log_id?, class_id? }
//   type  'pretest' (by term: TERM_1 / TERM_2) · 'observation' · 'workbook' · 'motor' (by month)
//   count  → { status, rows }                       how many marks would go
//   delete → { status, rows, log_id }               a copy is kept in assessment_clear_log
//   undo   → { status, rows }                       puts that copy back, exactly as it was
// A teacher, and only her own class's children. Other months, other tabs,
// attendance and the children themselves are never touched.
// =========================================================================
session_start();
header('Content-Type: application/json');
function fail($code, $msg){ http_response_code($code); echo json_encode(['status' => 'error', 'message' => $msg]); exit; }

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
if (($_SESSION['role'] ?? $devRole) !== 'teacher') fail(401, 'Not authorized.');
$in = json_decode(file_get_contents('php://input'), true) ?? [];
$action = (string) ($in['action'] ?? 'count');
$type = (string) ($in['type'] ?? '');
if (!in_array($action, ['count', 'delete', 'undo'], true)) fail(400, 'Unknown action.');
if (!in_array($type, ['pretest', 'observation', 'workbook', 'motor'], true)) fail(400, 'Unknown assessment type.');

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../pupils/pupil_helpers.php';
$conn = get_db_connection();
$class = pupil_authorized_class($conn, $in['class_id'] ?? null);
$cid = (int) $class['id'];
$uid = (int) ($_SESSION['user_id'] ?? 0);
$conn->query("CREATE TABLE IF NOT EXISTS assessment_clear_log (
  id INT AUTO_INCREMENT PRIMARY KEY, class_id INT NOT NULL, type VARCHAR(20) NOT NULL, scope VARCHAR(20) NOT NULL,
  rows_json LONGTEXT NOT NULL, row_count INT NOT NULL DEFAULT 0, deleted_by INT NULL,
  deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, restored_at TIMESTAMP NULL, INDEX (class_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
$month = (string) ($in['month'] ?? '');
$term = strtoupper((string) ($in['term'] ?? 'TERM_1'));
$scope = '';
if ($action !== 'undo') {          // undo takes its class, type and rows from the saved copy
    if ($type === 'pretest') { if (!in_array($term, ['TERM_1', 'TERM_2'], true)) fail(400, 'Invalid term.'); $scope = $term; }
    else { if (!in_array($month, $MONTHS, true)) fail(400, 'Choose a month.'); $scope = $month; }
}

// which rows: [table => SQL that selects their ids for this class and scope]
function targets($type){
    switch ($type) {
        case 'pretest': return [
            'pretest_activity_marks' => "SELECT m.id FROM pretest_activity_marks m JOIN pretest_sessions s ON s.id = m.session_id WHERE s.class_id = ? AND s.term = ?",
            'pretest_sessions'       => "SELECT s.id FROM pretest_sessions s WHERE s.class_id = ? AND s.term = ?"];
        case 'observation': return [
            'observation_assessment' => "SELECT a.id FROM observation_assessment a JOIN pupils p ON p.id = a.pupil_id JOIN observation_items i ON i.id = a.observation_item_id JOIN observation_themes t ON t.id = i.theme_id WHERE p.class_id = ? AND t.month_scheduled = ?"];
        case 'workbook': return [
            'workbook_assessment'    => "SELECT a.id FROM workbook_assessment a JOIN pupils p ON p.id = a.pupil_id JOIN workbook_pages g ON g.id = a.workbook_page_id WHERE p.class_id = ? AND g.month_scheduled = ?"];
        case 'motor': return [
            'motor_assessment'       => "SELECT a.id FROM motor_assessment a JOIN pupils p ON p.id = a.pupil_id WHERE p.class_id = ? AND a.month = ?"];
    }
}
function ids($conn, $sql, $cid, $scope){
    $st = $conn->prepare($sql); $st->bind_param('is', $cid, $scope); $st->execute();
    $out = array_map(fn($r) => (int) $r[0], $st->get_result()->fetch_all(MYSQLI_NUM)); $st->close(); return $out;
}

if ($action === 'count' || $action === 'delete') {
    $sets = []; foreach (targets($type) as $table => $sql) $sets[$table] = ids($conn, $sql, $cid, $scope);
    $markTable = array_key_first($sets); $count = count($sets[$markTable]);
    if ($action === 'count') { echo json_encode(['status' => 'success', 'rows' => $count, 'scope' => $scope]); exit; }
    if (!$count && !array_sum(array_map('count', $sets))) { echo json_encode(['status' => 'success', 'rows' => 0, 'log_id' => null]); exit; }
    $conn->begin_transaction();
    try {
        $copy = [];
        foreach ($sets as $table => $list) {           // keep every column of every row
            $copy[$table] = [];
            foreach (array_chunk($list, 500) as $chunk) {
                $res = $conn->query("SELECT * FROM `$table` WHERE id IN (" . implode(',', $chunk) . ")");
                while ($row = $res->fetch_assoc()) $copy[$table][] = $row;
            }
        }
        foreach ($sets as $table => $list)              // marks first, then (Pre-Test) the sessions
            foreach (array_chunk($list, 500) as $chunk) $conn->query("DELETE FROM `$table` WHERE id IN (" . implode(',', $chunk) . ")");
        $json = json_encode($copy, JSON_UNESCAPED_UNICODE);
        $st = $conn->prepare('INSERT INTO assessment_clear_log (class_id, type, scope, rows_json, row_count, deleted_by) VALUES (?, ?, ?, ?, ?, ?)');
        $st->bind_param('isssii', $cid, $type, $scope, $json, $count, $uid); $st->execute(); $logId = $st->insert_id; $st->close();
        $conn->commit();
        echo json_encode(['status' => 'success', 'rows' => $count, 'log_id' => $logId, 'scope' => $scope]);
    } catch (Throwable $e) { $conn->rollback(); error_log('clear_assessment: ' . $e->getMessage()); fail(500, 'Nothing was deleted — the database refused the change.'); }
    exit;
}

// undo
$logId = filter_var($in['log_id'] ?? null, FILTER_VALIDATE_INT);
if (!$logId) fail(400, 'Nothing to undo.');
$st = $conn->prepare('SELECT rows_json, row_count, restored_at FROM assessment_clear_log WHERE id = ? AND class_id = ? AND type = ?');
$st->bind_param('iis', $logId, $cid, $type); $st->execute(); $log = $st->get_result()->fetch_assoc(); $st->close();
if (!$log) fail(404, 'That deletion was not found for this class.');
if ($log['restored_at']) fail(409, 'That deletion was already undone.');
$copy = json_decode($log['rows_json'], true) ?: [];
$conn->begin_transaction();
try {
    foreach (array_reverse(array_keys($copy)) as $table) {   // (Pre-Test) the sessions first, then their marks
        foreach ($copy[$table] as $row) {
            $cols = array_keys($row);
            $sql = "INSERT IGNORE INTO `$table` (`" . implode('`,`', $cols) . "`) VALUES (" . implode(',', array_fill(0, count($cols), '?')) . ")";
            $st = $conn->prepare($sql); $vals = array_values($row);
            $st->bind_param(str_repeat('s', count($vals)), ...$vals); $st->execute(); $st->close();
        }
    }
    $st = $conn->prepare('UPDATE assessment_clear_log SET restored_at = NOW() WHERE id = ?'); $st->bind_param('i', $logId); $st->execute(); $st->close();
    $conn->commit();
    echo json_encode(['status' => 'success', 'rows' => (int) $log['row_count']]);
} catch (Throwable $e) { $conn->rollback(); error_log('clear_assessment undo: ' . $e->getMessage()); fail(500, 'The marks could not be put back.'); }
