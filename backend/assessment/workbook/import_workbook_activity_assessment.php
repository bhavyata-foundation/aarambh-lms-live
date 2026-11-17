<?php
// ARAMBH Workbook Assessment — batch import Child × Activity BPA marks.
session_start();
header('Content-Type: application/json; charset=utf-8');

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;
if ($effectiveRole !== 'teacher') {
    http_response_code(401); echo json_encode(['status'=>'error','message'=>'Not authorized.']); exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$ratings = $input['ratings'] ?? [];
if (!is_array($ratings)) { http_response_code(400); echo json_encode(['status'=>'error','message'=>'ratings must be an array.']); exit; }

require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../users/teacher_auth.php';
$conn = get_db_connection();
$teacherId = current_teacher_id();

try {
    $conn->begin_transaction();

    $own = $conn->prepare('SELECT 1 FROM pupils p JOIN classes c ON c.id=p.class_id WHERE p.id=? AND c.teacher_user_id=?');
    $activity = $conn->prepare('SELECT 1 FROM workbook_activities WHERE id=? AND assessable=1');
    $save = $conn->prepare('INSERT INTO workbook_activity_assessments (pupil_id,activity_id,level_mark,teacher_user_id) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE level_mark=VALUES(level_mark), teacher_user_id=VALUES(teacher_user_id), date_marked=CURRENT_TIMESTAMP');

    $saved = 0;
    foreach ($ratings as $i => $row) {
        $pupilId = (int)($row['pupil_id'] ?? 0);
        $activityId = (int)($row['activity_id'] ?? 0);
        $mark = strtoupper(trim((string)($row['level_mark'] ?? '')));
        if (!$pupilId || !$activityId || !in_array($mark, ['B','P','A'], true)) {
            throw new Exception('Invalid Workbook mark at row ' . ($i + 1) . '. Only B, P and A are accepted.');
        }
        $own->bind_param('ii', $pupilId, $teacherId); $own->execute();
        if (!$own->get_result()->num_rows) throw new Exception('A child in the import is not on this teacher\'s class roll.');
        $activity->bind_param('i', $activityId); $activity->execute();
        if (!$activity->get_result()->num_rows) throw new Exception('An imported workbook activity does not exist or is not assessable.');
        $save->bind_param('iisi', $pupilId, $activityId, $mark, $teacherId); $save->execute();
        $saved++;
    }
    $own->close(); $activity->close(); $save->close();
    $conn->commit();
    $conn->close();
    echo json_encode(['status'=>'success','saved'=>$saved]);
} catch (Throwable $e) {
    $conn->rollback();
    $conn->close();
    http_response_code(400);
    echo json_encode(['status'=>'error','message'=>$e->getMessage()]);
}
