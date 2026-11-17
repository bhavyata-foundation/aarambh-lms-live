<?php
// =========================================================================
// SAVE WORKBOOK MARKS — BATCH
//
// POST { workbook: { level, name, month },
//        marks: [ { pupil_id, workbook_page_id, level_mark }
//               | { pupil_id, item: { page_number, activity_no, cg_code, activity_title }, level_mark } ] }
//
// Imported sheet columns (item) are saved to workbook_activities / workbook_activity_assessments —
// the same tables the CG summary, the activity tally and the per-activity screens read.
// workbook_page_id marks keep their old route (workbook_assessment).
// level_mark: E / P / A, or null/'' to clear. Logged-in teacher only, her own children only.
// =========================================================================
session_start();
header('Content-Type: application/json; charset=utf-8');
set_exception_handler(function ($e) {
    error_log('save_workbook_marks_batch: ' . $e->getMessage());
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

function batch_fail($code, $message) {
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$marks = is_array($input['marks'] ?? null) ? $input['marks'] : null;
if ($marks === null) batch_fail(400, 'marks is required.');
if (count($marks) === 0) { echo json_encode(['status' => 'success', 'saved' => 0, 'cleared' => 0]); exit; }
if (count($marks) > 5000) batch_fail(400, 'Too many marks in one save (more than 5000).');

$raw = [];
foreach ($marks as $i => $m) {
    $pupilId = filter_var($m['pupil_id'] ?? null, FILTER_VALIDATE_INT);
    $pageId  = filter_var($m['workbook_page_id'] ?? null, FILTER_VALIDATE_INT) ?: null;
    $item    = (isset($m['item']) && is_array($m['item'])) ? $m['item'] : null;
    $level   = $m['level_mark'] ?? null;
    if ($level === '') $level = null;
    if (!$pupilId || (!$pageId && !$item)) batch_fail(400, 'Mark ' . ($i + 1) . ': pupil_id and workbook_page_id (or the sheet item) are both required.');
    if ($level !== null && !in_array($level, ['E', 'P', 'A', 'ABS'], true)) batch_fail(400, 'Mark ' . ($i + 1) . ': level_mark must be E, P, A, ABS or empty.');
    $raw[] = [$pupilId, $pageId, $level, $item];
}

require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../users/teacher_auth.php';
$teacherId = current_teacher_id();
$conn = get_db_connection();

$stmt = $conn->prepare('SELECT p.id FROM pupils p JOIN classes c ON c.id = p.class_id WHERE c.teacher_user_id = ?');
$stmt->bind_param('i', $teacherId);
$stmt->execute();
$mine = [];
foreach ($stmt->get_result()->fetch_all(MYSQLI_NUM) as $r) $mine[(int) $r[0]] = true;
$stmt->close();

// Workbook and month of this import
$wbName  = trim((string) ($input['workbook']['name'] ?? ''));
$wbLevel = trim((string) ($input['workbook']['level'] ?? ''));
$month   = substr(trim((string) ($input['workbook']['month'] ?? '')), 0, 20);
$workbookId = null;
if ($wbName !== '' && $wbLevel !== '') {
    $st = $conn->prepare('SELECT id FROM workbooks WHERE level = ? AND name = ? LIMIT 1');
    $st->bind_param('ss', $wbLevel, $wbName);
    $st->execute();
    $row = $st->get_result()->fetch_row();
    $st->close();
    $workbookId = $row ? (int) $row[0] : null;
}

// Imported columns -> workbook_pages rows: the same activity table the workbook grid reads (as Mithagar does).
// One row per workbook, page and activity number (the database's rule). Found, or created for this month.
$pageCache = [];
function page_for_item($conn, $workbookId, $month, $item, &$cache) {
    $pn = (int) ($item['page_number'] ?? 0);
    $an = (int) ($item['activity_no'] ?? 0);
    $cg = substr((string) ($item['cg_code'] ?? ''), 0, 20);
    $tt = substr((string) ($item['activity_title'] ?? ''), 0, 255);
    $k = $month . '|' . $pn . '|' . $an;
    if (isset($cache[$k])) return $cache[$k];
    $f = $conn->prepare('SELECT id FROM workbook_pages WHERE workbook_id = ? AND page_number = ? AND activity_no = ? LIMIT 1');
    $f->bind_param('iii', $workbookId, $pn, $an);
    $f->execute();
    $found = $f->get_result()->fetch_row();
    $f->close();
    if ($found) return $cache[$k] = (int) $found[0];
    $ins = $conn->prepare('INSERT INTO workbook_pages (workbook_id, month_scheduled, page_number, activity_no, cg_code, activity_title) VALUES (?, ?, ?, ?, ?, ?)');
    $ins->bind_param('isiiss', $workbookId, $month, $pn, $an, $cg, $tt);
    $ins->execute();
    $id = (int) $conn->insert_id;
    $ins->close();
    return $cache[$k] = $id;
}

$resolved = [];
foreach ($raw as [$pupilId, $pageId, $level, $item]) {
    if ($pageId !== null) {
        $resolved['page:' . $pupilId . ':' . $pageId] = ['page', $pupilId, $pageId, $level];
        continue;
    }
    if ($workbookId === null || $month === '') {
        $conn->close();
        batch_fail(400, 'The workbook or the month of this import is not set up on the server. Nothing was saved.');
    }
    $itemMonth = substr(trim((string) ($item['month'] ?? $month)), 0, 20);
    $pid = page_for_item($conn, $workbookId, $itemMonth !== '' ? $itemMonth : $month, $item, $pageCache);
    $resolved['page:' . $pupilId . ':' . $pid] = ['page', $pupilId, $pid, $level];
}
$clean = array_values($resolved);

// absences for an activity (a blank grade cell): kept apart from the grades
$conn->query("CREATE TABLE IF NOT EXISTS workbook_absences (id INT AUTO_INCREMENT PRIMARY KEY, pupil_id INT NOT NULL, workbook_page_id INT NOT NULL, teacher_user_id INT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uq_absent (pupil_id, workbook_page_id))");
$absPut = $conn->prepare('INSERT IGNORE INTO workbook_absences (pupil_id, workbook_page_id, teacher_user_id) VALUES (?, ?, ?)');
$absDel = $conn->prepare('DELETE FROM workbook_absences WHERE pupil_id = ? AND workbook_page_id = ?');

foreach ($clean as [$kind, $pupilId, $id, $level]) {
    if (!isset($mine[$pupilId])) { $conn->close(); batch_fail(403, 'A child in this file is not in your class (pupil ' . $pupilId . '). Nothing was saved.'); }
}

$putPage = $conn->prepare('INSERT INTO workbook_assessment (pupil_id, workbook_page_id, level_mark, teacher_user_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE level_mark = VALUES(level_mark), teacher_user_id = VALUES(teacher_user_id), date_marked = CURRENT_TIMESTAMP');
$delPage = $conn->prepare('DELETE FROM workbook_assessment WHERE pupil_id = ? AND workbook_page_id = ?');
$putAct  = $conn->prepare('INSERT INTO workbook_activity_assessments (pupil_id, activity_id, level_mark, teacher_user_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE level_mark = VALUES(level_mark), teacher_user_id = VALUES(teacher_user_id)');
$delAct  = $conn->prepare('DELETE FROM workbook_activity_assessments WHERE pupil_id = ? AND activity_id = ?');

$saved = 0; $cleared = 0;
$conn->begin_transaction();
try {
    foreach ($clean as [$kind, $pupilId, $id, $level]) {
        if ($kind === 'page') {
            if ($level === 'ABS') {
                $delPage->bind_param('ii', $pupilId, $id); $delPage->execute();
                $absPut->bind_param('iii', $pupilId, $id, $teacherId); $absPut->execute(); $saved++;
            } elseif ($level === null) {
                $delPage->bind_param('ii', $pupilId, $id); $delPage->execute();
                $absDel->bind_param('ii', $pupilId, $id); $absDel->execute(); $cleared++;
            } else {
                $putPage->bind_param('iisi', $pupilId, $id, $level, $teacherId); $putPage->execute();
                $absDel->bind_param('ii', $pupilId, $id); $absDel->execute(); $saved++;
            }
        } else {
            if ($level === null) { $delAct->bind_param('ii', $pupilId, $id); $delAct->execute(); $cleared++; }
            else {
                // activity marks are stored as B / P / A (page marks use E / P / A)
                $actMark = $level === 'E' ? 'B' : $level;
                $putAct->bind_param('iisi', $pupilId, $id, $actMark, $teacherId); $putAct->execute(); $saved++;
            }
        }
    }
    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback();
    error_log('save_workbook_marks_batch failed: ' . $e->getMessage());
    $conn->close();
    batch_fail(500, 'The marks could not be saved (nothing was saved): ' . $e->getMessage());
}
$putPage->close(); $delPage->close(); $putAct->close(); $delAct->close(); $conn->close();

echo json_encode(['status' => 'success', 'saved' => $saved, 'cleared' => $cleared]);