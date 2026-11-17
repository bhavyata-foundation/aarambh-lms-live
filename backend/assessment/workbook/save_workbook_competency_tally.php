<?php
// ============================================================
// SAVE WORKBOOK COMPETENCY TALLY — one competency, one month, for
// the logged-in teacher's OWN class only.
// File: backend/assessment/workbook/save_workbook_competency_tally.php
// POST JSON: { workbook_competency_id, month, count_e, count_p, count_a }
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

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$competencyId = (int) ($input['workbook_competency_id'] ?? 0);
$month  = trim((string) ($input['month'] ?? ''));
$countE = (int) ($input['count_e'] ?? 0);
$countP = (int) ($input['count_p'] ?? 0);
$countA = (int) ($input['count_a'] ?? 0);

if (!$competencyId || $month === '') leave_json_error(400, 'workbook_competency_id and month are both required.');
if ($countE < 0 || $countP < 0 || $countA < 0) leave_json_error(400, 'Counts cannot be negative.');

$stmt = $conn->prepare("SELECT 1 FROM workbook_competencies WHERE id = ?");
$stmt->bind_param('i', $competencyId);
$stmt->execute();
$exists = $stmt->get_result()->num_rows > 0;
$stmt->close();
if (!$exists) leave_json_error(400, 'That competency does not exist.');

$stmt = $conn->prepare("
    INSERT INTO workbook_class_tally (class_id, workbook_competency_id, month, count_e, count_p, count_a, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE count_e = VALUES(count_e), count_p = VALUES(count_p), count_a = VALUES(count_a), updated_by = VALUES(updated_by)
");
$stmt->bind_param('iisiiii', $classId, $competencyId, $month, $countE, $countP, $countA, $teacherId);
$stmt->execute();
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success']);