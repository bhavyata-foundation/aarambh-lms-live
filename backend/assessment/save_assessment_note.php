<?php
// Save/delete one teacher note for a child on the selected Workbook or Observation sheet.
session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../users/teacher_auth.php';

$teacherId = current_teacher_id();
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$type = $input['assessment_type'] ?? '';
$month = trim((string)($input['month'] ?? ''));
$contextId = isset($input['context_id']) ? (int)$input['context_id'] : 0;
$pupilId = isset($input['pupil_id']) ? (int)$input['pupil_id'] : 0;
$note = trim((string)($input['note'] ?? ''));

if (!in_array($type, ['observation','workbook'], true)) { http_response_code(400); echo json_encode(['status'=>'error','message'=>'Invalid assessment_type.']); exit; }
if ($month === '' || $contextId <= 0 || $pupilId <= 0) { http_response_code(400); echo json_encode(['status'=>'error','message'=>'month, context_id and pupil_id are required.']); exit; }
if (mb_strlen($note) > 1000) { http_response_code(400); echo json_encode(['status'=>'error','message'=>'Keep the note under 1000 characters.']); exit; }

$conn = get_db_connection();
$stmt = $conn->prepare('SELECT 1 FROM pupils p JOIN classes c ON c.id=p.class_id WHERE p.id=? AND c.teacher_user_id=? AND p.active=1 LIMIT 1');
$stmt->bind_param('ii', $pupilId, $teacherId); $stmt->execute();
if (!$stmt->get_result()->fetch_row()) { $stmt->close(); $conn->close(); http_response_code(403); echo json_encode(['status'=>'error','message'=>'This child is not in your class.']); exit; }
$stmt->close();

if ($note === '') {
    $stmt = $conn->prepare('DELETE FROM assessment_teacher_notes WHERE teacher_user_id=? AND pupil_id=? AND assessment_type=? AND month=? AND context_id=?');
    $stmt->bind_param('iissi', $teacherId, $pupilId, $type, $month, $contextId);
} else {
    $stmt = $conn->prepare('INSERT INTO assessment_teacher_notes (teacher_user_id,pupil_id,assessment_type,month,context_id,note) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE note=VALUES(note), updated_at=CURRENT_TIMESTAMP');
    $stmt->bind_param('iissis', $teacherId, $pupilId, $type, $month, $contextId, $note);
}
$stmt->execute(); $stmt->close(); $conn->close();
echo json_encode(['status'=>'success']);
