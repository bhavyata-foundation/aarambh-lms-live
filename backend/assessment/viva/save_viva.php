<?php
// Save Viva marks (B / P / A). Body: { class_id, term, marks: [ { pupil_id, question_no, level_mark } ] }.
// A null or empty level_mark clears that question. Teacher's own class only. All or nothing.
session_start();
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', '0');
$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
if (($_SESSION['role'] ?? $devRole) !== 'teacher') { http_response_code(401); echo json_encode(['status' => 'error', 'message' => 'Not authorized.']); exit; }
require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../users/teacher_auth.php';
$input = json_decode(file_get_contents('php://input'), true);
$classId = filter_var($input['class_id'] ?? null, FILTER_VALIDATE_INT);
$term = strtoupper(trim((string) ($input['term'] ?? '')));
$marks = is_array($input['marks'] ?? null) ? $input['marks'] : [];
if (!$classId || $term === '') { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'class_id and term are required.']); exit; }
$conn = get_db_connection();
$teacherId = (int) current_teacher_id();
$conn->query("CREATE TABLE IF NOT EXISTS viva_marks (class_id INT NOT NULL, term VARCHAR(20) NOT NULL, pupil_id INT NOT NULL, question_no VARCHAR(4) NOT NULL, level_mark CHAR(1) NOT NULL, teacher_user_id INT NULL, date_marked DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (class_id, term, pupil_id, question_no))");
$stmt = $conn->prepare('SELECT id FROM pupils WHERE class_id = ?');
$stmt->bind_param('i', $classId); $stmt->execute();
$mine = []; foreach ($stmt->get_result()->fetch_all(MYSQLI_NUM) as $r) $mine[(int) $r[0]] = true;
$stmt->close();
$questions = ['Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q9','Q10'];
$put = $conn->prepare('INSERT INTO viva_marks (class_id, term, pupil_id, question_no, level_mark, teacher_user_id) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE level_mark = VALUES(level_mark), teacher_user_id = VALUES(teacher_user_id), date_marked = CURRENT_TIMESTAMP');
$del = $conn->prepare('DELETE FROM viva_marks WHERE class_id = ? AND term = ? AND pupil_id = ? AND question_no = ?');
$saved = 0; $cleared = 0;
$conn->begin_transaction();
try {
    foreach ($marks as $i => $m) {
        $pupilId = filter_var($m['pupil_id'] ?? null, FILTER_VALIDATE_INT);
        $q = strtoupper(trim((string) ($m['question_no'] ?? '')));
        $lvl = strtoupper(trim((string) ($m['level_mark'] ?? '')));
        if (!$pupilId || !in_array($q, $questions, true)) throw new RuntimeException('Mark ' . ($i + 1) . ': pupil or question is invalid.');
        if (!isset($mine[(int) $pupilId])) throw new RuntimeException('Mark ' . ($i + 1) . ': pupil is not in this class.');
        if ($lvl === '') { $del->bind_param('isis', $classId, $term, $pupilId, $q); $del->execute(); $cleared++; continue; }
        if (!in_array($lvl, ['B','P','A'], true)) throw new RuntimeException('Mark ' . ($i + 1) . ': level must be B, P or A.');
        $put->bind_param('isissi', $classId, $term, $pupilId, $q, $lvl, $teacherId); $put->execute(); $saved++;
    }
    $conn->commit();
} catch (Throwable $e) {
    $conn->rollback(); $conn->close();
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage() . ' Nothing was saved.']);
    exit;
}
$put->close(); $del->close(); $conn->close();
echo json_encode(['status' => 'success', 'saved' => $saved, 'cleared' => $cleared]);
