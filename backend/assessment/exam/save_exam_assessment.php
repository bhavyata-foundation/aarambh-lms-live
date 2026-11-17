<?php
// ============================================================
// SAVE EXAM ASSESSMENT
// One row = one child + one term + one exam + one subject.
// Absent children are stored with present=0 and no score/level.
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

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$classId = isset($input['class_id']) ? (int)$input['class_id'] : 0;
$pupilId = isset($input['pupil_id']) ? (int)$input['pupil_id'] : 0;
$term = trim($input['term'] ?? '');
$examName = trim($input['exam_name'] ?? '');
$subject = trim($input['subject'] ?? '');
$examDate = trim($input['exam_date'] ?? '');
$maxMarks = isset($input['max_marks']) ? (float)$input['max_marks'] : 0;
$obtained = ($input['obtained_marks'] === null || $input['obtained_marks'] === '' || !isset($input['obtained_marks'])) ? null : (float)$input['obtained_marks'];
$present = !empty($input['present']) ? 1 : 0;
$level = $input['level'] ?? null;
$notes = trim($input['notes'] ?? '');

if (!$classId || !$pupilId || !in_array($term, ['Term 1','Term 2'], true) || $examName === '' || $subject === '' || $examDate === '' || $maxMarks <= 0) {
    http_response_code(400);
    echo json_encode(['status'=>'error','message'=>'class_id, pupil_id, term, exam_name, subject, exam_date and positive max_marks are required.']);
    exit;
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $examDate)) {
    http_response_code(400);
    echo json_encode(['status'=>'error','message'=>'exam_date must be YYYY-MM-DD.']);
    exit;
}
if ($present) {
    if ($obtained === null || $obtained < 0 || $obtained > $maxMarks) {
        http_response_code(400);
        echo json_encode(['status'=>'error','message'=>'Present children need obtained marks between 0 and max marks.']);
        exit;
    }
    $pct = ($obtained / $maxMarks) * 100;
    $calculatedLevel = $pct >= 80 ? 'A' : ($pct >= 50 ? 'P' : 'B');
    // Server is authoritative for BPA so the browser cannot submit a
    // different level than the recorded marks.
    $level = $calculatedLevel;
} else {
    $obtained = null;
    $level = null;
}

$conn = get_db_connection();
$teacherId = current_teacher_id();

$stmt = $conn->prepare('SELECT id FROM classes WHERE id = ? AND teacher_user_id = ? LIMIT 1');
$stmt->bind_param('ii', $classId, $teacherId);
$stmt->execute();
$ownsClass = (bool)$stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$ownsClass) {
    http_response_code(403);
    echo json_encode(['status'=>'error','message'=>'This class does not belong to the logged-in teacher.']);
    exit;
}

$stmt = $conn->prepare('SELECT id FROM pupils WHERE id = ? AND class_id = ? AND active = 1 LIMIT 1');
$stmt->bind_param('ii', $pupilId, $classId);
$stmt->execute();
$ownsPupil = (bool)$stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$ownsPupil) {
    http_response_code(403);
    echo json_encode(['status'=>'error','message'=>'This child is not in the selected class.']);
    exit;
}

$stmt = $conn->prepare('INSERT INTO exam_assessments (class_id,pupil_id,term,exam_name,subject,exam_date,max_marks,obtained_marks,present,level,notes,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE exam_date=VALUES(exam_date), max_marks=VALUES(max_marks), obtained_marks=VALUES(obtained_marks), present=VALUES(present), level=VALUES(level), notes=VALUES(notes), updated_by=VALUES(updated_by)');
$stmt->bind_param('iissssddissi', $classId, $pupilId, $term, $examName, $subject, $examDate, $maxMarks, $obtained, $present, $level, $notes, $teacherId);
$stmt->execute();
$stmt->close();
$conn->close();

echo json_encode(['status'=>'success','level'=>$level]);
