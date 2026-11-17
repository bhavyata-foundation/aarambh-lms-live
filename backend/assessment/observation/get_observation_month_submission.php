<?php
// Classroom Observation: is this class's month submitted? (teacher only, own classes only)
session_start();
header('Content-Type: application/json');
$role = $_SESSION['role'] ?? null;
if ($role !== 'teacher') { http_response_code(401); echo json_encode(['status' => 'error', 'message' => 'Not authorized.']); exit; }
require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../users/teacher_auth.php';
$classId = (int) ($_GET['class_id'] ?? 0);
$month = trim((string) ($_GET['month'] ?? ''));
$teacherId = current_teacher_id();
$conn = get_db_connection();
$stmt = $conn->prepare('SELECT s.submitted_at, s.submitted_by FROM observation_month_submissions s JOIN classes c ON c.id = s.class_id WHERE s.class_id = ? AND s.month = ? AND c.teacher_user_id = ?');
$stmt->bind_param('isi', $classId, $month, $teacherId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close(); $conn->close();
echo json_encode(['status' => 'success', 'submitted' => (bool) $row, 'submitted_at' => $row['submitted_at'] ?? null, 'submitted_by' => isset($row['submitted_by']) ? (int) $row['submitted_by'] : null]);
