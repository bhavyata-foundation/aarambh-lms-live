<?php
// Resolve a physical workbook page scan key to its exact activity list.
session_start();
header('Content-Type: application/json');
$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;
if ($effectiveRole !== 'teacher') { http_response_code(401); echo json_encode(['status'=>'error','message'=>'Not authorized.']); exit; }
$scanKey = trim($_GET['scan_key'] ?? '');
if ($scanKey === '') { http_response_code(400); echo json_encode(['status'=>'error','message'=>'scan_key is required.']); exit; }
require_once __DIR__ . '/../../users/db_config.php';
$conn=get_db_connection();
$stmt=$conn->prepare("SELECT s.scan_key, s.page_number, w.id workbook_id, w.book_code, w.name, w.level
                     FROM workbook_page_scan_map s JOIN workbooks w ON w.id=s.workbook_id WHERE s.scan_key=?");
$stmt->bind_param('s',$scanKey); $stmt->execute(); $r=$stmt->get_result();
$page=$r->fetch_assoc(); $stmt->close();
if(!$page){$conn->close();http_response_code(404);echo json_encode(['status'=>'error','message'=>'This page scan is not registered in ARAMBH.']);exit;}
$stmt=$conn->prepare("SELECT id, activity_code, page_number, activity_no, activity_title, topic, cg_code, cg_group, month_scheduled FROM workbook_activities WHERE workbook_id=? AND page_number=? AND assessable=1 ORDER BY activity_no");
$wid=(int)$page['workbook_id'];$pn=(int)$page['page_number'];$stmt->bind_param('ii',$wid,$pn);$stmt->execute();$r=$stmt->get_result();$activities=[];while($row=$r->fetch_assoc()){$activities[]=['id'=>(int)$row['id'],'activity_code'=>$row['activity_code'],'page_number'=>(int)$row['page_number'],'activity_no'=>(int)$row['activity_no'],'activity_title'=>$row['activity_title'],'topic'=>$row['topic'],'cg_code'=>$row['cg_code'],'cg_group'=>$row['cg_group'],'month'=>$row['month_scheduled']];}$stmt->close();$conn->close();
echo json_encode(['status'=>'success','page'=>['scan_key'=>$page['scan_key'],'page_number'=>(int)$page['page_number'],'workbook_id'=>$wid,'book_code'=>$page['book_code'],'book_name'=>$page['name'],'level'=>$page['level'],'activities'=>$activities]],JSON_UNESCAPED_UNICODE);
