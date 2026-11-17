<?php
// ============================================================
// GET EXAM ASSESSMENT
// Returns saved rows for one class + term + exam + subject.
// ============================================================
session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../users/teacher_auth.php';

if (($_SESSION['role'] ?? null) !== 'teacher') {
    http_response_code(401);
    echo json_encode(['status'=>'error','message'=>'Not authorized.']);
    exit;
}

$conn = get_db_connection();
$teacherId = current_teacher_id();

$classId = filter_input(INPUT_GET, 'class_id', FILTER_VALIDATE_INT);
$term = trim($_GET['term'] ?? '');
$examName = trim($_GET['exam_name'] ?? '');
$subject = trim($_GET['subject'] ?? '');

if (!$classId || !in_array($term, ['Term 1','Term 2'], true) || $examName === '' || $subject === '') {
    http_response_code(400);
    echo json_encode(['status'=>'error','message'=>'class_id, term, exam_name and subject are required.']);
    exit;
}

$stmt = $conn->prepare('SELECT id FROM classes WHERE id = ? AND teacher_user_id = ? LIMIT 1');
$stmt->bind_param('ii', $classId, $teacherId);
$stmt->execute();
$owns = (bool)$stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$owns) {
    http_response_code(403);
    echo json_encode(['status'=>'error','message'=>'This class does not belong to the logged-in teacher.']);
    exit;
}

$stmt = $conn->prepare('SELECT pupil_id, exam_name, subject, exam_date, max_marks, obtained_marks, present, level, notes, updated_at FROM exam_assessments WHERE class_id = ? AND term = ? AND exam_name = ? AND subject = ? ORDER BY pupil_id');
$stmt->bind_param('isss', $classId, $term, $examName, $subject);
$stmt->execute();
$result = $stmt->get_result();
$records = [];
while ($row = $result->fetch_assoc()) {
    $row['pupil_id'] = (int)$row['pupil_id'];
    $row['max_marks'] = (float)$row['max_marks'];
    $row['obtained_marks'] = $row['obtained_marks'] === null ? null : (float)$row['obtained_marks'];
    $row['present'] = (int)$row['present'];
    if ($row['obtained_marks'] !== null && $row['max_marks'] > 0) {
        $row['percentage'] = round(($row['obtained_marks'] / $row['max_marks']) * 100, 1);
    } else {
        $row['percentage'] = null;
    }
    $records[] = $row;
}
$stmt->close();
$conn->close();

echo json_encode(['status'=>'success','records'=>$records]);
