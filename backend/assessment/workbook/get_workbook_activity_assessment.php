<?php
// ARAMBH Workbook Assessment — per-pupil BPA marks.
session_start();
header('Content-Type: application/json');

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;
if ($effectiveRole !== 'teacher') { http_response_code(401); echo json_encode(['status'=>'error','message'=>'Not authorized.']); exit; }

$month = trim($_GET['month'] ?? '');
require_once __DIR__ . '/../../users/db_config.php';
$conn = get_db_connection();
$teacherId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 49;

$sql = "SELECT aa.pupil_id, aa.activity_id, aa.level_mark
        FROM workbook_activity_assessments aa
        JOIN pupils p ON p.id = aa.pupil_id
        JOIN classes c ON c.id = p.class_id
        JOIN workbook_activities a ON a.id = aa.activity_id
        WHERE c.teacher_user_id = ?";
if ($month !== '') $sql .= " AND a.month_scheduled = ?";
$sql .= " ORDER BY aa.pupil_id, aa.activity_id";
$stmt = $conn->prepare($sql);
if ($month !== '') $stmt->bind_param('is', $teacherId, $month); else $stmt->bind_param('i', $teacherId);
$stmt->execute();
$r = $stmt->get_result();
$marks = [];
while ($row = $r->fetch_assoc()) {
    $marks[] = ['pupil_id'=>(int)$row['pupil_id'], 'activity_id'=>(int)$row['activity_id'], 'level_mark'=>$row['level_mark']];
}
$stmt->close(); $conn->close();
echo json_encode(['status'=>'success','marks'=>$marks]);
