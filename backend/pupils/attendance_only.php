<?php
// =========================================================================
// ATTENDANCE ONLY — children on the roll for attendance, but NOT assessed
// -------------------------------------------------------------------------
// GET  ?class_id=…                         → { status, ids: [pupil ids] }
// POST { pupil_id, on: true|false, class_id? } → set / clear, for a child of the
//      teacher's own class (same login rule as rename_pupil.php)
// The assessment screens, reports and figures leave these children out.
// The table is created on first use.
// =========================================================================
session_start();
header('Content-Type: application/json');
$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$role = $_SESSION['role'] ?? $devRole;
if (!in_array($role, ['teacher', 'supervisor', 'superadmin'], true)) { http_response_code(401); echo json_encode(['status' => 'error', 'message' => 'Not authorized.']); exit; }
require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/pupil_helpers.php';
$conn = get_db_connection();
$conn->query("CREATE TABLE IF NOT EXISTS pupil_attendance_only (
  pupil_id INT PRIMARY KEY, class_id INT NOT NULL, set_by INT NULL, set_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $classId = filter_var($_GET['class_id'] ?? null, FILTER_VALIDATE_INT);
    if ($role === 'teacher') { $class = pupil_authorized_class($conn, $classId ?: null); $classId = (int) $class['id']; }
    if (!$classId) { echo json_encode(['status' => 'success', 'ids' => []]); exit; }
    $st = $conn->prepare('SELECT a.pupil_id FROM pupil_attendance_only a JOIN pupils p ON p.id = a.pupil_id WHERE p.class_id = ?');
    $st->bind_param('i', $classId); $st->execute();
    $ids = array_map(fn($r) => (int) $r[0], $st->get_result()->fetch_all(MYSQLI_NUM)); $st->close();
    echo json_encode(['status' => 'success', 'ids' => $ids]); exit;
}

if ($role !== 'teacher') { http_response_code(403); echo json_encode(['status' => 'error', 'message' => 'Only the class teacher can change this.']); exit; }
$in = json_decode(file_get_contents('php://input'), true) ?? [];
$pid = filter_var($in['pupil_id'] ?? null, FILTER_VALIDATE_INT);
if (!$pid) { http_response_code(400); echo json_encode(['status' => 'error', 'message' => 'pupil_id is required.']); exit; }
$class = pupil_authorized_class($conn, $in['class_id'] ?? null);
$cid = (int) $class['id'];
$st = $conn->prepare('SELECT id FROM pupils WHERE id = ? AND class_id = ?'); $st->bind_param('ii', $pid, $cid); $st->execute();
$ok = $st->get_result()->fetch_assoc(); $st->close();
if (!$ok) { http_response_code(404); echo json_encode(['status' => 'error', 'message' => 'That child is not in your class.']); exit; }
if (!empty($in['on'])) {
    $uid = (int) ($_SESSION['user_id'] ?? 0);
    $st = $conn->prepare('INSERT INTO pupil_attendance_only (pupil_id, class_id, set_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE class_id = VALUES(class_id), set_by = VALUES(set_by)');
    $st->bind_param('iii', $pid, $cid, $uid); $st->execute(); $st->close();
} else {
    $st = $conn->prepare('DELETE FROM pupil_attendance_only WHERE pupil_id = ?'); $st->bind_param('i', $pid); $st->execute(); $st->close();
}
echo json_encode(['status' => 'success', 'pupil_id' => $pid, 'on' => !empty($in['on'])]);
