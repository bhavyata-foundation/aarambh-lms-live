<?php
// Classroom Observation: undo a month's submission. Changes the status flag only; no marks are touched.
session_start();
header('Content-Type: application/json');
$role = $_SESSION['role'] ?? null;
if ($role !== 'teacher') { http_response_code(401); echo json_encode(['status' => 'error', 'message' => 'Not authorized.']); exit; }
require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../users/teacher_auth.php';
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$classId = (int) ($in['class_id'] ?? 0);
$month = trim((string) ($in['month'] ?? ''));
$teacherId = current_teacher_id();
$conn = get_db_connection();
$stmt = $conn->prepare('DELETE s FROM observation_month_submissions s JOIN classes c ON c.id = s.class_id WHERE s.class_id = ? AND s.month = ? AND c.teacher_user_id = ?');
$stmt->bind_param('isi', $classId, $month, $teacherId);
$stmt->execute(); $stmt->close(); $conn->close();
echo json_encode(['status' => 'success']);
