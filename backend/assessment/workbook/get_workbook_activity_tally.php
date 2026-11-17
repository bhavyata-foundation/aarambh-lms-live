<?php
// ARAMBH Workbook Assessment — class tally derived from Child × Activity BPA marks.
session_start();
header('Content-Type: application/json');
$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;
if ($effectiveRole !== 'teacher') { http_response_code(401); echo json_encode(['status'=>'error','message'=>'Not authorized.']); exit; }
$month = trim($_GET['month'] ?? '');
if ($month === '') { http_response_code(400); echo json_encode(['status'=>'error','message'=>'month is required.']); exit; }
require_once __DIR__ . '/../../users/db_config.php';
$conn = get_db_connection();
if (!isset($_SESSION['user_id']) || !is_numeric($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'message' => 'Teacher session not found'
    ]);
    exit;
}

$teacherId = (int)$_SESSION['user_id'];
$sql = "SELECT a.id AS activity_id,
               SUM(CASE WHEN aa.level_mark='B' THEN 1 ELSE 0 END) AS count_b,
               SUM(CASE WHEN aa.level_mark='P' THEN 1 ELSE 0 END) AS count_p,
               SUM(CASE WHEN aa.level_mark='A' THEN 1 ELSE 0 END) AS count_a
        FROM workbook_activities a
        LEFT JOIN (
            SELECT aa.activity_id, aa.level_mark
            FROM workbook_activity_assessments aa
            JOIN pupils p ON p.id=aa.pupil_id
            JOIN classes c ON c.id=p.class_id
            WHERE c.teacher_user_id=?
        ) aa ON aa.activity_id=a.id
        WHERE a.month_scheduled=? AND a.assessable=1
        GROUP BY a.id";
$stmt = $conn->prepare($sql); $stmt->bind_param('is', $teacherId, $month); $stmt->execute(); $r=$stmt->get_result();
$stmt = $conn->prepare($sql);
$stmt->bind_param('is', $teacherId, $month);
$stmt->execute();

$rs = $stmt->get_result();

while ($row = $rs->fetch_assoc()) {
    $tally[(int)$row['activity_id']] = [
        'count_b' => (int)$row['count_b'],
        'count_p' => (int)$row['count_p'],
        'count_a' => (int)$row['count_a']
    ];
}
$stmt->close(); $conn->close();
echo json_encode(['status'=>'success','tally'=>$tally]);
