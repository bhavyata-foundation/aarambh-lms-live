<?php
// ============================================================
// GET WORKBOOK COMPETENCY TALLY — the logged-in teacher's OWN class
// counts (count_e / count_p / count_a) for one month, every workbook.
// Now per class (workbook_class_tally), so no two class logins ever
// see or overwrite each other's numbers.
// File: backend/assessment/workbook/get_workbook_competency_tally.php
// GET: month
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

$month = trim((string) ($_GET['month'] ?? ''));
if ($month === '') leave_json_error(400, 'month is required.');

$stmt = $conn->prepare("SELECT workbook_competency_id, count_e, count_p, count_a FROM workbook_class_tally WHERE class_id = ? AND month = ?");
$stmt->bind_param('is', $classId, $month);
$stmt->execute();
$res = $stmt->get_result();
$tally = [];
while ($row = $res->fetch_assoc()) {
    $tally[] = [
        'workbook_competency_id' => (int) $row['workbook_competency_id'],
        'count_e' => (int) $row['count_e'],
        'count_p' => (int) $row['count_p'],
        'count_a' => (int) $row['count_a'],
    ];
}
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'tally' => $tally]);