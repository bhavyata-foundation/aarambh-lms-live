<?php
// =========================================================================
// backend/assessment/pretest/save_pretest_marks.php — save Pre-Test marks
// -------------------------------------------------------------------------
// POST JSON:
//   { class_id, term: "TERM_1" | "TERM_2",
//     marks: [ { pupil_id, activity_no (1–26), level_mark: "B"|"P"|"A"|null,
//                activity_type, activity_name, cg_code, page_no } , … ] }
// level_mark null (or "") = Not assessed: the mark is removed.
// The activity's name, CG and page come from the screen, so Jr KG and
// Sr KG Pre-Tests are each stored with their own activities.
// Only the logged-in teacher's own class can be saved (pupil_authorized_class).
// Everything is saved in one transaction: all of it, or none of it.
// Tables: backend/sql/pretest_assessments.sql
// =========================================================================
session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../pupils/pupil_helpers.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') pupil_json_error(405, 'Use POST.');
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) pupil_json_error(400, 'The request was not valid JSON.');

    $conn  = get_db_connection();
    $class = pupil_authorized_class($conn, $input['class_id'] ?? null);
    $term  = strtoupper(trim((string)($input['term'] ?? 'TERM_1')));
    if (!in_array($term, ['TERM_1', 'TERM_2'], true)) pupil_json_error(400, 'Invalid term.');
    $marks = is_array($input['marks'] ?? null) ? $input['marks'] : [];
    if (!$marks) pupil_json_error(400, 'No marks supplied.');
    if (count($marks) > 5000) pupil_json_error(400, 'Too many marks in one request (5000 at most).');

    // The class's children — a mark can only be saved for a child of this class.
    $kids = [];
    $r = $conn->prepare('SELECT id FROM pupils WHERE class_id = ? AND active = 1');
    $r->bind_param('i', $class['id']); $r->execute(); $res = $r->get_result();
    while ($p = $res->fetch_assoc()) $kids[(int)$p['id']] = true;
    $r->close();

    $teacherId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
    $cut = fn($v, $n) => function_exists('mb_substr') ? mb_substr(trim((string)$v), 0, $n) : substr(trim((string)$v), 0, $n * 3); // works with or without the mbstring add-on

    $session = $conn->prepare('INSERT INTO pretest_sessions (class_id, pupil_id, term, attendance_status, created_by)
                               VALUES (?, ?, ?, \'PRESENT\', ?)
                               ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP');
    $find    = $conn->prepare('SELECT id FROM pretest_sessions WHERE class_id = ? AND pupil_id = ? AND term = ?');
    $put     = $conn->prepare('INSERT INTO pretest_activity_marks (session_id, activity_no, activity_type, activity_name, cg_code, page_no, level_mark)
                               VALUES (?, ?, ?, ?, ?, ?, ?)
                               ON DUPLICATE KEY UPDATE level_mark = VALUES(level_mark), activity_type = VALUES(activity_type),
                                 activity_name = VALUES(activity_name), cg_code = VALUES(cg_code), page_no = VALUES(page_no)');
    $del     = $conn->prepare('DELETE FROM pretest_activity_marks WHERE session_id = ? AND activity_no = ?');

    $conn->begin_transaction();
    $saved = 0; $cleared = 0; $skipped = []; $sessionOf = [];
    foreach ($marks as $i => $m) {
        $pid = (int)($m['pupil_id'] ?? 0);
        $act = (int)($m['activity_no'] ?? 0);
        $lvl = strtoupper(trim((string)($m['level_mark'] ?? '')));
        if (!isset($kids[$pid]))          { $skipped[] = 'Mark ' . ($i + 1) . ': the child is not in this class.'; continue; }
        if ($act < 1 || $act > 26)        { $skipped[] = 'Mark ' . ($i + 1) . ': activity must be 1–26.'; continue; }
        if ($lvl !== '' && !in_array($lvl, ['B', 'P', 'A', 'AB'], true)) { $skipped[] = 'Mark ' . ($i + 1) . ': the mark must be B, P, A or AB (absent).'; continue; }

        if (!isset($sessionOf[$pid])) {
            $session->bind_param('iisi', $class['id'], $pid, $term, $teacherId); $session->execute();
            $find->bind_param('iis', $class['id'], $pid, $term); $find->execute();
            $sessionOf[$pid] = (int)$find->get_result()->fetch_assoc()['id'];
        }
        $sid = $sessionOf[$pid];
        if ($lvl === '') {
            $del->bind_param('ii', $sid, $act); $del->execute(); $cleared += $del->affected_rows;
        } else {
            $type = $cut($m['activity_type'] ?? '', 20); $name = $cut($m['activity_name'] ?? '', 255);
            $cg = $cut($m['cg_code'] ?? '', 30); $page = $cut($m['page_no'] ?? '', 10);
            $put->bind_param('iisssss', $sid, $act, $type, $name, $cg, $page, $lvl); $put->execute(); $saved++;
        }
    }
    $conn->commit();
    foreach ([$session, $find, $put, $del] as $s) $s->close();
    $conn->close();
    echo json_encode(['status' => 'success', 'term' => $term, 'saved' => $saved, 'cleared' => $cleared, 'skipped' => $skipped]);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli) { try { $conn->rollback(); } catch (Throwable $x) {} }
    error_log('save_pretest_marks failed: ' . $e->getMessage());
    http_response_code(500);
    // "AB" (absent) before backend/sql/007_pretest_absent.sql was run: say so, plainly.
    $needs007 = ($e instanceof mysqli_sql_exception) && in_array((int) $e->getCode(), [1265, 1366], true);
    echo json_encode(['status' => 'error', 'message' => $needs007
        ? 'Absent can\'t be saved yet: run backend/sql/007_pretest_absent.sql in phpMyAdmin. Nothing was saved.'
        : 'Could not save the Pre-Test marks.']);
}
