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
    $term = strtoupper(trim($input['term'] ?? 'TERM_1'));
    $date = trim((string)($input['assessment_date'] ?? ''));
    $rows = is_array($input['rows'] ?? null) ? $input['rows'] : [];
    if (!in_array($term,['TERM_1','TERM_2'],true)) pupil_json_error(400,'Invalid term.');
    if ($date !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/',$date)) pupil_json_error(400,'Invalid assessment date.');
    if (!$rows) pupil_json_error(400,'No rows supplied.');

    $roster = [];
    $r = $conn->prepare('SELECT id, name, register_no FROM pupils WHERE class_id = ? AND active = 1');
    $r->bind_param('i',$class['id']); $r->execute(); $rr=$r->get_result();
    while($p=$rr->fetch_assoc()){ $roster[]=$p; }
    $r->close();
    $byReg=[]; $byName=[];
    foreach($roster as $p){ $rg=trim((string)$p['register_no']); if($rg!=='') $byReg[$rg]=(int)$p['id']; $byName[strtolower(trim($p['name']))]=(int)$p['id']; } // blank register numbers are not keys: they used to all match the last child

    $activities = [1=>['Worksheet','Tick the good hygiene habits','CG 1.2','04'],2=>['Worksheet','Circle the organised classroom habits','CG 1.3','03'],3=>['Worksheet','Tick the safe tools','CG 1.4','04'],4=>['Worksheet','Circle soft things','CG 2.5','01'],5=>['Worksheet','Circle your family members','CG 4.1','04'],6=>['Worksheet','Circle how you feel today','CG 4.2','03'],7=>['Worksheet','Circle the kind actions','CG 4.6','04'],8=>['Worksheet','Tick the children respecting others','CG 4.7','03'],9=>['Worksheet','Put same time objects together','CG 7.1','02'],10=>['Worksheet','Circle all the traced circles','CG 8.1','03'],11=>['Worksheet','Circle what comes next','CG 8.2','01'],12=>['Worksheet','Match the shape to object','CG 8.8','02'],13=>['Worksheet','Circle the heavy object','CG 8.9','02'],14=>['Worksheet','Tick the boy who is singing','CG 9.1','01'],15=>['Worksheet','Tick after doing each action','CG 9.4','02'],16=>['Worksheet','Trace the dotted lines','CG 10.8','04'],17=>['Worksheet','Make an artwork using any material','CG 12.1','03'],18=>['Worksheet','Tick the children who is working alone','CG 12.4','02'],19=>['Worksheet','Tick the child who has not completed the task','CG 13.1','01'],20=>['Worksheet','Circle what you want to explore','CG 13.3','01'],21=>['Classroom','Move Safely Game','CG 1.5','—'],22=>['Classroom','Touch and Tell Bag','CG 2.5','—'],23=>['Classroom','Carry and Walk Task','CG 3.4','—'],24=>['Classroom','Take Turn Game','CG 4.4','—'],25=>['Classroom','Which Tool for What?','CG 7.3','—'],26=>['Classroom','Count and Give','CG 8.3','—']];
    $teacherId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
    $conn->begin_transaction(); $imported=0; $skipped=[];
    foreach($rows as $i=>$row){
        $rowNo=$i+1; $pid=0;
        if(isset($row['register_no']) && isset($byReg[trim((string)$row['register_no'])])) $pid=$byReg[trim((string)$row['register_no'])];
        if(!$pid && isset($row['student_name']) && isset($byName[strtolower(trim((string)$row['student_name']))])) $pid=$byName[strtolower(trim((string)$row['student_name']))];
        if(!$pid){$skipped[]="Row $rowNo: student not found in this class.";continue;}
        $att=strtoupper(trim((string)($row['attendance_status']??'NOT_MARKED'))); if(!in_array($att,['PRESENT','ABSENT','NOT_MARKED'],true))$att='NOT_MARKED';
        $stmt=$conn->prepare('INSERT INTO pretest_sessions(class_id,pupil_id,term,assessment_date,attendance_status,created_by) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE assessment_date=VALUES(assessment_date),attendance_status=VALUES(attendance_status)');
        $dateValue=$date!==''?$date:null; $stmt->bind_param('iisssi',$class['id'],$pid,$term,$dateValue,$att,$teacherId);$stmt->execute();$stmt->close();
        $q=$conn->prepare('SELECT id FROM pretest_sessions WHERE class_id=? AND pupil_id=? AND term=?');$q->bind_param('iis',$class['id'],$pid,$term);$q->execute();$sid=(int)$q->get_result()->fetch_assoc()['id'];$q->close();
        foreach($activities as $n=>$meta){
            $key='activity_'.$n; if(!array_key_exists($key,$row) || $row[$key]==='') continue;
            $level=strtoupper(trim((string)$row[$key]));
            if(!in_array($level,['B','P','A'],true)){ $skipped[]="Row $rowNo activity $n: level must be B, P or A."; continue; }
            [$type,$name,$cg,$page]=$meta;
            $m=$conn->prepare('INSERT INTO pretest_activity_marks(session_id,activity_no,activity_type,activity_name,cg_code,page_no,level_mark) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE level_mark=VALUES(level_mark)');
            $cgN = strtoupper(trim((string) $cg)); $cgN = preg_replace('/^CG[\s-]*/', 'C-', $cgN); /* CG 1.2 -> C-1.2 */ $m->bind_param('iisssss',$sid,$n,$type,$name,$cgN,$page,$level);$m->execute();$m->close();$imported++;
        }
    }
    $conn->commit();$conn->close();
    echo json_encode(['status'=>'success','imported_marks'=>$imported,'skipped'=>$skipped]);
} catch(Throwable $e){ if(isset($conn)){$conn->rollback();$conn->close();} error_log('import_pretest failed: '.$e->getMessage()); http_response_code(500); echo json_encode(['status'=>'error','message'=>'Could not import the Pre-Test file.','detail'=>$e->getMessage().' (line '.$e->getLine().')']); }
