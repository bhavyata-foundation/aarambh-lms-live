<?php
// Teacher notes for a selected assessment sheet.
session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../users/teacher_auth.php';

$teacherId = current_teacher_id();
$type = $_GET['assessment_type'] ?? '';
$month = trim((string)($_GET['month'] ?? ''));
$contextId = isset($_GET['context_id']) ? (int)$_GET['context_id'] : 0;

if (!in_array($type, ['observation','workbook'], true) || $month === '' || $contextId <= 0) {
    http_response_code(400);
    echo json_encode(['status'=>'error','message'=>'assessment_type, month and context_id are required.']);
    exit;
}

$conn = get_db_connection();
$stmt = $conn->prepare(
    'SELECT n.pupil_id, n.note
       FROM assessment_teacher_notes n
       JOIN pupils p ON p.id = n.pupil_id
       JOIN classes c ON c.id = p.class_id
      WHERE n.teacher_user_id = ?
        AND n.assessment_type = ?
        AND n.month = ?
        AND n.context_id = ?
        AND c.teacher_user_id = ?'
);
$stmt->bind_param('issii', $teacherId, $type, $month, $contextId, $teacherId);
$stmt->execute();
$res = $stmt->get_result();
$notes = [];
while ($row = $res->fetch_assoc()) $notes[(int)$row['pupil_id']] = $row['note'];
$stmt->close();
$conn->close();

echo json_encode(['status'=>'success','notes'=>$notes]);
