<?php
// Activity coverage: how many activities assess each competency (C-x.y), by workbook, Classroom Observation and Pre-Test,
// for one term. Teacher only. Each saved page / item / activity row counts once.
session_start();
header('Content-Type: application/json; charset=utf-8');
if (($_SESSION['role'] ?? null) !== 'teacher') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}
$level = trim((string) ($_GET['level'] ?? 'Sr KG'));
$term  = strtoupper(trim((string) ($_GET['term'] ?? 'TERM_1')));
$months = $term === 'TERM_2'
    ? ['November', 'December', 'January', 'February', 'March']
    : ['June', 'July', 'August', 'September', 'October'];
$ph = implode(',', array_fill(0, count($months), '?'));

function norm_code($raw) {
    $s = strtoupper(trim((string) $raw));
    $s = preg_replace('/^(CG|C)[\s\-]*/', 'C-', $s);
    return preg_match('/^C-\d+\.\d+$/', $s) ? $s : null;
}

require_once __DIR__ . '/../../users/db_config.php';
$conn = get_db_connection();
$rows = [];
$workbooks = [];
$add = function ($code, $col, $n) use (&$rows) {
    if ($code === null) return;
    if (!isset($rows[$code])) $rows[$code] = [];
    $rows[$code][$col] = ($rows[$code][$col] ?? 0) + (int) $n;
};

// 1. Workbooks: one column per workbook, counting its saved pages (activities) for each competency
$stmt = $conn->prepare("SELECT wb.name AS workbook, wp.cg_code, COUNT(*) AS n
    FROM workbook_pages wp JOIN workbooks wb ON wb.id = wp.workbook_id
    WHERE wb.level = ? AND wp.month_scheduled IN ($ph) AND wp.cg_code <> ''
    GROUP BY wb.name, wp.cg_code");
$stmt->bind_param('s' . str_repeat('s', count($months)), $level, ...$months);
$stmt->execute();
$res = $stmt->get_result();
while ($r = $res->fetch_assoc()) {
    $code = norm_code($r['cg_code']);
    if ($code === null) continue;
    if (!in_array($r['workbook'], $workbooks, true)) $workbooks[] = $r['workbook'];
    $add($code, 'wb:' . $r['workbook'], $r['n']);
}
$stmt->close();

// 2. Classroom Observation: items per competency in this term's themes
$stmt = $conn->prepare("SELECT oi.cg_code, COUNT(*) AS n
    FROM observation_items oi JOIN observation_themes ot ON ot.id = oi.theme_id
    WHERE ot.level = ? AND ot.month_scheduled IN ($ph) AND oi.retired = 0 AND ot.retired = 0
    GROUP BY oi.cg_code");
$stmt->bind_param('s' . str_repeat('s', count($months)), $level, ...$months);
$stmt->execute();
$res = $stmt->get_result();
while ($r = $res->fetch_assoc()) { $add(norm_code($r['cg_code']), 'obs', $r['n']); }
$stmt->close();

// 3. Pre-Test: Pre-Test is taken in Term 1 only
if ($term !== 'TERM_2') {
    $stmt = $conn->prepare("SELECT cg, COUNT(*) AS n FROM content_pretest_activities WHERE level = ? AND retired = 0 GROUP BY cg");
    $stmt->bind_param('s', $level);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) { $add(norm_code($r['cg']), 'pre', $r['n']); }
    $stmt->close();
}
$conn->close();

echo json_encode(['status' => 'success', 'term' => $term, 'workbooks' => $workbooks, 'rows' => $rows], JSON_UNESCAPED_UNICODE);
