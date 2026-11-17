<?php
// =========================================================================
// backend/assessment/pretest/get_pretest_assessment.php
// Reads one class's Pre-Test (or Term) marks for every active child.
//
// GET  ?class_id=N&term=TERM_1 (or TERM_2; a bare "1"/"2" is also accepted)
// →  { status: "success", term, sessions: {
//        "<pupil_id>": {
//          attendance: "present" | "absent" | … | null,
//          marks:   { "<activity_no>": "B"|"P"|"A" },        // used by the Pre-Test entry screen
//          byCode:  { "<cg_code>": { b: n, p: n, a: n } }     // used by the Assessment Dashboard reports
//        }, … } }
// Children with no marks still appear, with empty objects (no invented data).
// Only the logged-in teacher's own class can be read (pupil_authorized_class).
// Tables: pretest_sessions, pretest_activity_marks (backend/sql/pretest_assessments.sql)
// =========================================================================
session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../pupils/pupil_helpers.php';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') pupil_json_error(405, 'Use GET.');

    $conn  = get_db_connection();
    $class = pupil_authorized_class($conn, $_GET['class_id'] ?? null);

    $termRaw = strtoupper(trim((string)($_GET['term'] ?? 'TERM_1')));
    if (preg_match('/^[12]$/', $termRaw)) $termRaw = 'TERM_' . $termRaw;
    if (!in_array($termRaw, ['TERM_1', 'TERM_2'], true)) pupil_json_error(400, 'Invalid term.');
    $term = $termRaw;

    // 1. every active child of the class (so a child with no marks still shows)
    $sessions = [];
    $kids = $conn->prepare('SELECT id FROM pupils WHERE class_id = ? AND active = 1');
    $kids->bind_param('i', $class['id']);
    $kids->execute();
    $kidRes = $kids->get_result();
    while ($k = $kidRes->fetch_assoc()) {
        $sessions[(string)(int)$k['id']] = ['attendance' => null, 'marks' => new stdClass(), 'byCode' => new stdClass()];
    }

    // 2. attendance for the term
    $att = $conn->prepare('SELECT pupil_id, attendance_status FROM pretest_sessions WHERE class_id = ? AND term = ?');
    $att->bind_param('is', $class['id'], $term);
    $att->execute();
    $attRes = $att->get_result();
    while ($a = $attRes->fetch_assoc()) {
        $pid = (string)(int)$a['pupil_id'];
        if (isset($sessions[$pid])) $sessions[$pid]['attendance'] = $a['attendance_status'];
    }

    // 3. every saved mark for the class and term
    $q = $conn->prepare(
        'SELECT s.pupil_id, m.activity_no, m.cg_code, m.level_mark
           FROM pretest_activity_marks m
           JOIN pretest_sessions s ON s.id = m.session_id
          WHERE s.class_id = ? AND s.term = ?'
    );
    $q->bind_param('is', $class['id'], $term);
    $q->execute();
    $res = $q->get_result();

    $tmp = [];   // pid => [ activity_no => level ], pid => [ cg => [b,p,a] ]
    while ($m = $res->fetch_assoc()) {
        $pid = (string)(int)$m['pupil_id'];
        $lvl = strtoupper(trim((string)$m['level_mark']));
        if (!isset($sessions[$pid]) || !in_array($lvl, ['B', 'P', 'A'], true)) continue; // AB / blank = not counted
        $tmp[$pid]['marks'][(int)$m['activity_no']] = $lvl;
        $code = trim((string)$m['cg_code']);
        if ($code === '') continue;
        if (!isset($tmp[$pid]['byCode'][$code])) $tmp[$pid]['byCode'][$code] = ['b' => 0, 'p' => 0, 'a' => 0];
        $tmp[$pid]['byCode'][$code][strtolower($lvl)]++;
    }

    foreach ($tmp as $pid => $parts) {
        if (!isset($sessions[$pid])) continue;
        if (!empty($parts['marks'])) $sessions[$pid]['marks'] = (object) $parts['marks'];
        if (!empty($parts['byCode'])) $sessions[$pid]['byCode'] = (object) $parts['byCode'];
    }

    echo json_encode(['status' => 'success', 'term' => $term, 'sessions' => (object) $sessions],
                     JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    pupil_json_error(500, 'Could not load the Pre-Test marks.');
}