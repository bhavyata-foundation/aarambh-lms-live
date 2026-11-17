<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../pupils/pupil_helpers.php';

try {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $conn = get_db_connection();
    $class = pupil_authorized_class($conn, $input['class_id'] ?? ($_GET['class_id'] ?? null));

    $pupilId = (int)($input['pupil_id'] ?? 0);
    $activityNo = (int)($input['activity_no'] ?? 0);
    $term = strtoupper(trim($input['term'] ?? 'TERM_1'));
    $level = $input['level_mark'] ?? null;
    $attendance = strtoupper(trim($input['attendance_status'] ?? 'NOT_MARKED'));
    $assessmentDate = trim((string)($input['assessment_date'] ?? ''));

    if (!$pupilId || $activityNo < 1 || $activityNo > 26) pupil_json_error(400, 'Invalid pupil or activity.');
    if (!in_array($term, ['TERM_1','TERM_2'], true)) pupil_json_error(400, 'Invalid term.');
    if ($level !== null && !in_array($level, ['B','P','A'], true)) pupil_json_error(400, 'level_mark must be B, P, A, or null.');
    if (!in_array($attendance, ['PRESENT','ABSENT','NOT_MARKED'], true)) pupil_json_error(400, 'Invalid attendance status.');
    if ($assessmentDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $assessmentDate)) pupil_json_error(400, 'Invalid assessment date.');

    $stmt = $conn->prepare('SELECT id FROM pupils WHERE id = ? AND class_id = ? AND active = 1 LIMIT 1');
    $stmt->bind_param('ii', $pupilId, $class['id']);
    $stmt->execute();
    $pupil = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$pupil) pupil_json_error(403, 'That pupil is not in this class.');

    $teacherId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
    $dateValue = $assessmentDate !== '' ? $assessmentDate : null;

    $stmt = $conn->prepare(
        'INSERT INTO pretest_sessions (class_id,pupil_id,term,assessment_date,attendance_status,created_by)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE assessment_date=VALUES(assessment_date), attendance_status=VALUES(attendance_status), updated_at=CURRENT_TIMESTAMP'
    );
    $stmt->bind_param('iisssi', $class['id'], $pupilId, $term, $dateValue, $attendance, $teacherId);
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare('SELECT id FROM pretest_sessions WHERE class_id = ? AND pupil_id = ? AND term = ? LIMIT 1');
    $stmt->bind_param('iis', $class['id'], $pupilId, $term);
    $stmt->execute();
    $sessionId = (int)$stmt->get_result()->fetch_assoc()['id'];
    $stmt->close();

    if ($level === null || $level === '') {
        $stmt = $conn->prepare('DELETE FROM pretest_activity_marks WHERE session_id = ? AND activity_no = ?');
        $stmt->bind_param('ii', $sessionId, $activityNo);
        $stmt->execute();
        $stmt->close();
    } else {
        $activities = [
            1=>['Worksheet','Tick the good hygiene habits','CG 1.2','04'],2=>['Worksheet','Circle the organised classroom habits','CG 1.3','03'],3=>['Worksheet','Tick the safe tools','CG 1.4','04'],4=>['Worksheet','Circle soft things','CG 2.5','01'],5=>['Worksheet','Circle your family members','CG 4.1','04'],6=>['Worksheet','Circle how you feel today','CG 4.2','03'],7=>['Worksheet','Circle the kind actions','CG 4.6','04'],8=>['Worksheet','Tick the children respecting others','CG 4.7','03'],9=>['Worksheet','Put same time objects together','CG 7.1','02'],10=>['Worksheet','Circle all the traced circles','CG 8.1','03'],11=>['Worksheet','Circle what comes next','CG 8.2','01'],12=>['Worksheet','Match the shape to object','CG 8.8','02'],13=>['Worksheet','Circle the heavy object','CG 8.9','02'],14=>['Worksheet','Tick the boy who is singing','CG 9.1','01'],15=>['Worksheet','Tick after doing each action','CG 9.4','02'],16=>['Worksheet','Trace the dotted lines','CG 10.8','04'],17=>['Worksheet','Make an artwork using any material','CG 12.1','03'],18=>['Worksheet','Tick the children who is working alone','CG 12.4','02'],19=>['Worksheet','Tick the child who has not completed the task','CG 13.1','01'],20=>['Worksheet','Circle what you want to explore','CG 13.3','01'],21=>['Classroom','Move Safely Game','CG 1.5','—'],22=>['Classroom','Touch and Tell Bag','CG 2.5','—'],23=>['Classroom','Carry and Walk Task','CG 3.4','—'],24=>['Classroom','Take Turn Game','CG 4.4','—'],25=>['Classroom','Which Tool for What?','CG 7.3','—'],26=>['Classroom','Count and Give','CG 8.3','—']
        ];
        [$type,$name,$cg,$page] = $activities[$activityNo];
        $stmt = $conn->prepare(
            'INSERT INTO pretest_activity_marks (session_id,activity_no,activity_type,activity_name,cg_code,page_no,level_mark)
             VALUES (?,?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE activity_type=VALUES(activity_type),activity_name=VALUES(activity_name),cg_code=VALUES(cg_code),page_no=VALUES(page_no),level_mark=VALUES(level_mark),updated_at=CURRENT_TIMESTAMP'
        );
        $stmt->bind_param('iisssss', $sessionId, $activityNo, $type, $name, $cg, $page, $level);
        $stmt->execute();
        $stmt->close();
    }
    $conn->close();
    echo json_encode(['status'=>'success','pupil_id'=>$pupilId,'activity_no'=>$activityNo,'level_mark'=>$level]);
} catch (Throwable $e) {
    error_log('save_pretest_assessment failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status'=>'error','message'=>'Could not save the Pre-Test result.']);
}
