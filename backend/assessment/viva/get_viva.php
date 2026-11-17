<?php
// Viva marks for the teacher's active class and term: one row per child, one B / P / A per question (Q1–Q10).
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
$classRow = teacher_active_class($conn, (int) current_teacher_id());
$term = strtoupper(trim((string) ($_GET['term'] ?? 'TERM_1')));
$questions = ['Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q9','Q10'];
if (!$classRow) { echo json_encode(['status' => 'success', 'questions' => $questions, 'marks' => new stdClass()]); $conn->close(); exit; }
$conn->query("CREATE TABLE IF NOT EXISTS viva_marks (class_id INT NOT NULL, term VARCHAR(20) NOT NULL, pupil_id INT NOT NULL, question_no VARCHAR(4) NOT NULL, level_mark CHAR(1) NOT NULL, teacher_user_id INT NULL, date_marked DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (class_id, term, pupil_id, question_no))");
$stmt = $conn->prepare('SELECT pupil_id, question_no, level_mark FROM viva_marks WHERE class_id = ? AND term = ?');
$classId = (int) $classRow['id'];
$stmt->bind_param('is', $classId, $term); $stmt->execute();
$marks = [];
foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $r) { $marks[(string) $r['pupil_id']][$r['question_no']] = $r['level_mark']; }
$stmt->close(); $conn->close();
echo json_encode(['status' => 'success', 'questions' => $questions, 'marks' => $marks ?: new stdClass()]);
