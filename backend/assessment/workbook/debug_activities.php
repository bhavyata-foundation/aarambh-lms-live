<?php
// TEMPORARY diagnostic: lists the workbook activity rows and mark counts for this teacher. Delete after use.
session_start();
header('Content-Type: text/plain; charset=utf-8');
$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocal = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocal && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
if (($_SESSION['role'] ?? $devRole) !== 'teacher') { echo "Not logged in as teacher.\n"; exit; }
require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../users/teacher_auth.php';
$teacherId = current_teacher_id();
$conn = get_db_connection();
echo "Teacher user id: $teacherId\n\n";
$res = $conn->query("SELECT w.id, w.level, w.name FROM workbooks w");
echo "WORKBOOKS:\n"; while ($r = $res->fetch_assoc()) echo "  id={$r['id']} level={$r['level']} name={$r['name']}\n";
echo "\nACTIVITY ROWS (month, workbook, page, activity_no, assessable, code):\n";
$res = $conn->query("SELECT a.id, a.workbook_id, a.month_scheduled, a.page_number, a.activity_no, a.assessable, a.activity_code, a.cg_code
                     FROM workbook_activities a ORDER BY a.month_scheduled, a.id");
$n = 0; while ($r = $res->fetch_assoc()) { $n++; echo "  id={$r['id']} wb={$r['workbook_id']} month=[{$r['month_scheduled']}] page={$r['page_number']} act={$r['activity_no']} assessable={$r['assessable']} cg={$r['cg_code']} code={$r['activity_code']}\n"; }
echo "  total rows: $n\n";
echo "\nMARKS PER ACTIVITY (this teacher's children):\n";
$stmt = $conn->prepare("SELECT aa.activity_id, COUNT(*) AS marks FROM workbook_activity_assessments aa
                        JOIN pupils p ON p.id = aa.pupil_id JOIN classes c ON c.id = p.class_id
                        WHERE c.teacher_user_id = ? GROUP BY aa.activity_id ORDER BY aa.activity_id");
$stmt->bind_param('i', $teacherId); $stmt->execute();
$res = $stmt->get_result(); $m = 0;
while ($r = $res->fetch_assoc()) { $m++; echo "  activity_id={$r['activity_id']} marks={$r['marks']}\n"; }
if (!$m) echo "  (none)\n";
echo "\nPAGE-LEVEL MARKS (workbook_assessment): ";
$r = $conn->query("SELECT COUNT(*) FROM workbook_assessment")->fetch_row(); echo $r[0] . "\n";
$conn->close();
