<?php
// ARAMBH Workbook Assessment — save one Child × Activity BPA mark.
session_start();
header('Content-Type: application/json');

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;
if ($effectiveRole !== 'teacher') { http_response_code(401); echo json_encode(['status'=>'error','message'=>'Not authorized.']); exit; }

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$pupilId = (int)($input['pupil_id'] ?? 0);
$activityId = (int)($input['activity_id'] ?? 0);
$mark = $input['level_mark'] ?? null;
if ($mark === '') $mark = null;
if (!$pupilId || !$activityId) { http_response_code(400); echo json_encode(['status'=>'error','message'=>'pupil_id and activity_id are required.']); exit; }
if ($mark !== null && !in_array($mark, ['B','P','A'], true)) { http_response_code(400); echo json_encode(['status'=>'error','message'=>'level_mark must be B, P, A, or null.']); exit; }

require_once __DIR__ . '/../../users/db_config.php';
$conn = get_db_connection();
$teacherId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 49;

$stmt = $conn->prepare('SELECT 1 FROM pupils p JOIN classes c ON c.id=p.class_id WHERE p.id=? AND c.teacher_user_id=?');
$stmt->bind_param('ii', $pupilId, $teacherId); $stmt->execute();
if (!$stmt->get_result()->num_rows) { $stmt->close(); $conn->close(); http_response_code(403); echo json_encode(['status'=>'error','message'=>'That pupil is not in your class.']); exit; }
$stmt->close();

$stmt = $conn->prepare('SELECT 1 FROM workbook_activities WHERE id=? AND assessable=1');
$stmt->bind_param('i', $activityId); $stmt->execute();
if (!$stmt->get_result()->num_rows) { $stmt->close(); $conn->close(); http_response_code(400); echo json_encode(['status'=>'error','message'=>'That workbook activity does not exist.']); exit; }
$stmt->close();

if ($mark === null) {
    $stmt = $conn->prepare('DELETE FROM workbook_activity_assessments WHERE pupil_id=? AND activity_id=?');
    $stmt->bind_param('ii', $pupilId, $activityId); $stmt->execute(); $stmt->close();
} else {
    $stmt = $conn->prepare('INSERT INTO workbook_activity_assessments (pupil_id,activity_id,level_mark,teacher_user_id) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE level_mark=VALUES(level_mark), teacher_user_id=VALUES(teacher_user_id), date_marked=CURRENT_TIMESTAMP');
    $stmt->bind_param('iisi', $pupilId, $activityId, $mark, $teacherId); $stmt->execute(); $stmt->close();
}
$conn->close();
echo json_encode(['status'=>'success']);
