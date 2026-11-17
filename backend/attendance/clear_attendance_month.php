<?php
// =========================================================================
// CLEAR ATTENDANCE MONTH — delete every attendance mark of ONE month for
// ONE class (e.g. after a wrong import). Children, assessments, holidays
// and other months are not touched.
//
// POST { class_id?, month: "2026-09" | "all", action: "count" | "delete", confirm }
//   month "all" = every attendance mark of the class (every month); confirm "DELETE ALL".
//   count   → how many marks that month has (present / absent)
//   delete  → needs confirm = the month written out, e.g. "September 2026"
//             (any capitals). Returns the deleted marks, so the screen can
//             put them back (Undo, through save_attendance.php).
// Only the logged-in teacher's own class (pupil_authorized_class).
// =========================================================================
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../pupils/pupil_helpers.php';

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$month = (string) ($input['month'] ?? '');
if ($month === 'all') {                                 // every month at once
    $first = '1900-01-01'; $last = '2999-12-31'; $label = 'all months';
} else {
    if (!preg_match('/^(\d{4})-(0[1-9]|1[0-2])$/', $month, $m)) pupil_json_error(400, 'month must look like 2026-09, or be "all".');
    $first = $month . '-01';
    $last = date('Y-m-t', strtotime($first));
    $label = date('F Y', strtotime($first));           // "September 2026"
}
$confirmWord = $month === 'all' ? 'delete all' : strtolower($label);
$action = (string) ($input['action'] ?? 'count');

$conn = get_db_connection();
$class = pupil_authorized_class($conn, $input['class_id'] ?? null);
$classId = (int) $class['id'];

// every child of this class — on the roll or taken off it — so nothing of this month is left behind
$ids = [];
$st = $conn->prepare('SELECT id FROM pupils WHERE class_id = ?');
$st->bind_param('i', $classId); $st->execute();
foreach ($st->get_result()->fetch_all(MYSQLI_NUM) as $r) $ids[] = (int) $r[0];
$st->close();
if (!$ids) { echo json_encode(['status' => 'success', 'month' => $month, 'label' => $label, 'total' => 0, 'present' => 0, 'absent' => 0, 'deleted' => 0, 'marks' => []]); exit; }
$in = implode(',', $ids);

$st = $conn->prepare("SELECT COUNT(*), COALESCE(SUM(status = 'present'), 0), COALESCE(SUM(status = 'absent'), 0) FROM daily_attendance WHERE pupil_id IN ($in) AND date BETWEEN ? AND ?");
$st->bind_param('ss', $first, $last); $st->execute();
[$total, $present, $absent] = array_map('intval', $st->get_result()->fetch_row());
$st->close();

$months = [];
if ($month === 'all') {
    $res = $conn->query("SELECT DATE_FORMAT(date, '%Y-%m') ym, COUNT(*) FROM daily_attendance WHERE pupil_id IN ($in) GROUP BY ym ORDER BY ym");
    while ($r = $res->fetch_row()) $months[] = ['month' => $r[0], 'label' => date('F Y', strtotime($r[0] . '-01')), 'marks' => (int) $r[1]];
}
if ($action === 'count') {
    echo json_encode(['status' => 'success', 'month' => $month, 'label' => $label, 'total' => $total, 'present' => $present, 'absent' => $absent, 'months' => $months]);
    exit;
}
if ($action !== 'delete') pupil_json_error(400, 'Unknown action.');
if (strtolower(trim(preg_replace('/\s+/', ' ', (string) ($input['confirm'] ?? '')))) !== $confirmWord) {
    pupil_json_error(400, 'Type ' . ($month === 'all' ? 'DELETE ALL' : $label) . ' to confirm. Nothing was deleted.');
}

$conn->begin_transaction();
try {
    $st = $conn->prepare("SELECT pupil_id, DATE_FORMAT(date, '%Y-%m-%d') AS date, status FROM daily_attendance WHERE pupil_id IN ($in) AND date BETWEEN ? AND ? ORDER BY date, pupil_id");
    $st->bind_param('ss', $first, $last); $st->execute();
    $rows = $st->get_result()->fetch_all(MYSQLI_ASSOC);
    $st->close();
    $st = $conn->prepare("DELETE FROM daily_attendance WHERE pupil_id IN ($in) AND date BETWEEN ? AND ?");
    $st->bind_param('ss', $first, $last); $st->execute();
    $deleted = $st->affected_rows;
    $st->close();
    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback();
    error_log('clear_attendance_month failed: ' . $e->getMessage());
    pupil_json_error(500, 'The marks could not be deleted. Nothing was changed.');
}
$conn->close();
echo json_encode(['status' => 'success', 'month' => $month, 'label' => $label, 'deleted' => $deleted,
                  'marks' => array_map(fn($r) => ['pupil_id' => (int) $r['pupil_id'], 'date' => $r['date'], 'status' => $r['status']], $rows)]);
