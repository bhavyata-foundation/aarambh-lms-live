<?php
// ============================================================
// GET WORKBOOK TALLY TREND — two months' counts side by side for
// every competency, for the logged-in teacher's OWN class.
// File: backend/assessment/workbook/get_workbook_tally_trend.php
// GET: from_month, to_month
// ============================================================

session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');
set_exception_handler(function($e){
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
});

require_once __DIR__ . '/../../teacher_leave/leave_helpers.php';
if (leave_effective_role() !== 'teacher') leave_json_error(401, 'Not authorized.');

require_once __DIR__ . '/../../users/db_config.php';
$conn = get_db_connection();
$teacherId = leave_user_id($conn, 'teacher');
if (!$teacherId) leave_json_error(401, 'Could not determine teacher.');

// The logged-in teacher's class — every count below belongs to it only.
require_once __DIR__ . '/../../users/teacher_class.php';
$classRow = teacher_active_class($conn, (int) $teacherId); // the class she is working in (class switch)
if (!$classRow) leave_json_error(403, 'This login is not linked to a class yet.');
$classId = (int) $classRow['id'];

$fromMonth = trim((string) ($_GET['from_month'] ?? ''));
$toMonth   = trim((string) ($_GET['to_month'] ?? ''));
if ($fromMonth === '' || $toMonth === '') leave_json_error(400, 'from_month and to_month are both required.');

$result = $conn->query("
    SELECT wc.id, wc.cg_code, wc.competency_text,
           cg.id AS curricular_goal_id, cg.goal_text,
           da.id AS area_id, da.name AS area_name
    FROM workbook_competencies wc
    JOIN curricular_goals cg ON cg.id = wc.curricular_goal_id
    JOIN development_areas da ON da.id = cg.development_area_id
    ORDER BY da.id, cg.id, wc.display_order
");
$competencies = [];
while ($row = $result->fetch_assoc()) {
    $row['e_from'] = 0; $row['p_from'] = 0; $row['a_from'] = 0;
    $row['e_to'] = 0;   $row['p_to'] = 0;   $row['a_to'] = 0;
    $competencies[(int) $row['id']] = $row;
}

if ($competencies) {
    foreach (['from' => $fromMonth, 'to' => $toMonth] as $suffix => $month) {
        $stmt = $conn->prepare("SELECT workbook_competency_id, count_e, count_p, count_a FROM workbook_class_tally WHERE class_id = ? AND month = ?");
        $stmt->bind_param('is', $classId, $month);
        $stmt->execute();
        $r = $stmt->get_result();
        while ($row = $r->fetch_assoc()) {
            $id = (int) $row['workbook_competency_id'];
            if (!isset($competencies[$id])) continue;
            $competencies[$id]['e_' . $suffix] = (int) $row['count_e'];
            $competencies[$id]['p_' . $suffix] = (int) $row['count_p'];
            $competencies[$id]['a_' . $suffix] = (int) $row['count_a'];
        }
        $stmt->close();
    }
}
$conn->close();

echo json_encode(['status' => 'success', 'competencies' => array_values($competencies)]);