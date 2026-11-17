<?php
// =========================================================================
// ADMISSION AND ASSESSMENT MAP (for the Assessment Dashboard)
// Returns, for the teacher's active class: each child's admission date and, for each month,
// how many workbook and observation marks are saved, plus the Pre-Test marks saved for the term.
// Read-only.
// =========================================================================
session_start();
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', '0');
$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
if (($_SESSION['role'] ?? $devRole) !== 'teacher') { http_response_code(401); echo json_encode(['status' => 'error', 'message' => 'Not authorized.']); exit; }
require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../users/teacher_auth.php';
require_once __DIR__ . '/../../users/teacher_class.php';
$conn = get_db_connection();
$teacherId = current_teacher_id();
$classRow = teacher_active_class($conn, (int) $teacherId);
if (!$classRow) { echo json_encode(['status' => 'success', 'children' => [], 'months' => []]); $conn->close(); exit; }
$classId = (int) $classRow['id'];
$months = ['June', 'July', 'August', 'September', 'October'];
$term = 'TERM_1';
// children
$children = [];
$stmt = $conn->prepare('SELECT id, name, admitted_date FROM pupils WHERE class_id = ? ORDER BY name');
$stmt->bind_param('i', $classId); $stmt->execute();
foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $r) {
    $children[(int) $r['id']] = ['pupil_id' => (int) $r['id'], 'name' => $r['name'],
        'admitted_date' => $r['admitted_date'] ? substr($r['admitted_date'], 0, 10) : null,
        'cells' => [], 'pretest' => 0];
}
$stmt->close();
foreach ($months as $m) {
    foreach ($children as $id => $_) { $children[$id]['cells'][$m] = ['workbook' => 0, 'observation' => 0]; }
    // workbook marks for the month
    $q = $conn->prepare("SELECT wa.pupil_id, COUNT(*) AS n FROM workbook_assessment wa
        JOIN workbook_pages wp ON wp.id = wa.workbook_page_id
        JOIN pupils p ON p.id = wa.pupil_id
        WHERE p.class_id = ? AND wp.month_scheduled = ? AND wa.level_mark IN ('E','P','A')
        GROUP BY wa.pupil_id");
    $q->bind_param('is', $classId, $m); $q->execute();
    foreach ($q->get_result()->fetch_all(MYSQLI_ASSOC) as $r) { if (isset($children[(int) $r['pupil_id']])) $children[(int) $r['pupil_id']]['cells'][$m]['workbook'] = (int) $r['n']; }
    $q->close();
    // observation marks for the month
    $q = $conn->prepare("SELECT oa.pupil_id, COUNT(*) AS n FROM observation_assessment oa
        JOIN observation_items oi ON oi.id = oa.observation_item_id
        JOIN observation_themes ot ON ot.id = oi.theme_id
        JOIN pupils p ON p.id = oa.pupil_id
        WHERE p.class_id = ? AND ot.month_scheduled = ? AND oa.level_mark IN ('E','P','A','B')
        GROUP BY oa.pupil_id");
    $q->bind_param('is', $classId, $m); $q->execute();
    foreach ($q->get_result()->fetch_all(MYSQLI_ASSOC) as $r) { if (isset($children[(int) $r['pupil_id']])) $children[(int) $r['pupil_id']]['cells'][$m]['observation'] = (int) $r['n']; }
    $q->close();
}
// Pre-Test marks for the term
$q = $conn->prepare("SELECT ps.pupil_id, COUNT(pam.id) AS n FROM pretest_sessions ps
    LEFT JOIN pretest_activity_marks pam ON pam.session_id = ps.id AND pam.level_mark IN ('B','P','A','E')
    WHERE ps.class_id = ? AND ps.term = ? GROUP BY ps.pupil_id");
$q->bind_param('is', $classId, $term); $q->execute();
foreach ($q->get_result()->fetch_all(MYSQLI_ASSOC) as $r) { if (isset($children[(int) $r['pupil_id']])) $children[(int) $r['pupil_id']]['pretest'] = (int) $r['n']; }
$q->close();
$conn->close();
echo json_encode(['status' => 'success', 'months' => $months, 'children' => array_values($children)]);
