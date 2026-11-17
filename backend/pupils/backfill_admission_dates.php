<?php
// One-time (and safe to repeat) backfill: sets every child's admission date in the teacher's active class
// from their first recorded attendance day (P or A).
session_start();
header('Content-Type: application/json; charset=utf-8');
$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;
if ($effectiveRole !== 'teacher') { http_response_code(401); echo json_encode(['status' => 'error', 'message' => 'Not authorized.']); exit; }
require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../users/teacher_auth.php';
require_once __DIR__ . '/../users/teacher_class.php';
require_once __DIR__ . '/admission_sync.php';
$conn = get_db_connection();
$teacherId = current_teacher_id();
$classRow = teacher_active_class($conn, (int) $teacherId);
if (!$classRow) { echo json_encode(['status' => 'success', 'updated' => 0]); $conn->close(); exit; }
$stmt = $conn->prepare('SELECT id FROM pupils WHERE class_id = ?');
$stmt->bind_param('i', $classRow['id']);
$stmt->execute();
$ids = array_map(fn($r) => (int) $r['id'], $stmt->get_result()->fetch_all(MYSQLI_ASSOC));
$stmt->close();
$updated = sync_admission_dates($conn, $ids);
$conn->close();
echo json_encode(['status' => 'success', 'updated' => $updated]);
