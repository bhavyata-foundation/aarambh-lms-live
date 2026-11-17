<?php
// Classroom Observation: mark a month as submitted. A status flag only; the marks stay editable.
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
if ($classId <= 0 || $month === '') { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'class_id and month are required.']); exit; }
$conn = get_db_connection();
$own = $conn->prepare('SELECT id FROM classes WHERE id = ? AND teacher_user_id = ?');
$own->bind_param('ii', $classId, $teacherId); $own->execute();
if (!$own->get_result()->fetch_assoc()) { $own->close(); $conn->close(); http_response_code(403); echo json_encode(['status' => 'error', 'message' => 'This is not your class.']); exit; }
$own->close();
$stmt = $conn->prepare('INSERT INTO observation_month_submissions (class_id, month, submitted_by, submitted_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE submitted_by = VALUES(submitted_by), submitted_at = NOW()');
$stmt->bind_param('isi', $classId, $month, $teacherId);
$stmt->execute(); $stmt->close(); $conn->close();
echo json_encode(['status' => 'success']);
