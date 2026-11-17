<?php
// ============================================================
// APPLY FOR LEAVE — teacher submits a leave request. It starts as
// pending with both the supervisor and the principal.
// File: backend/teacher_leave/apply_leave.php
// POST JSON: { leave_type, start_date, end_date, reason }
// ============================================================

session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');
set_exception_handler(function($e){
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
});

require_once __DIR__ . '/leave_helpers.php';
if (leave_effective_role() !== 'teacher') leave_json_error(401, 'Not authorized.');

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$leaveType = $input['leave_type'] ?? '';
$startDate = trim($input['start_date'] ?? '');
$endDate   = trim($input['end_date'] ?? '');
$reason    = trim((string)($input['reason'] ?? ''));

if (!in_array($leaveType, ['casual', 'sick', 'other'], true)) leave_json_error(400, 'Choose a leave type.');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) leave_json_error(400, 'Start and end dates are required.');
if ($endDate < $startDate) leave_json_error(400, 'The end date cannot be before the start date.');
if ($reason === '') leave_json_error(400, 'A reason is required.');
if (strtotime($endDate) - strtotime($startDate) > 60 * 86400) leave_json_error(400, 'A single request can cover at most 60 days.');

$workingDates = leave_working_dates($startDate, $endDate);
if (!count($workingDates)) leave_json_error(400, 'Those dates have no working days (Sundays, the last Saturday and holidays are not counted).');

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$teacherId = leave_user_id($conn, 'teacher');
if (!$teacherId) leave_json_error(401, 'Could not determine teacher.');

// No overlap with another pending or approved request of hers.
$stmt = $conn->prepare("
    SELECT id FROM teacher_leave_requests
    WHERE teacher_user_id = ? AND status IN ('pending','approved')
      AND start_date <= ? AND end_date >= ?
    LIMIT 1
");
$stmt->bind_param('iss', $teacherId, $endDate, $startDate);
$stmt->execute();
$overlap = $stmt->get_result()->fetch_assoc();
$stmt->close();
if ($overlap) { $conn->close(); leave_json_error(409, 'You already have a pending or approved leave request covering some of these dates.'); }

// Her class/school, so the principal of that school can see it.
require_once __DIR__ . '/../users/teacher_class.php';
$class = teacher_active_class($conn, (int) $teacherId); // the class she is working in (class switch)
$classId  = $class ? (int) $class['id'] : null;
$schoolId = $class ? (int) $class['school_id'] : null;

$workingDays = count($workingDates);
$stmt = $conn->prepare("
    INSERT INTO teacher_leave_requests
      (teacher_user_id, school_id, class_id, leave_type, start_date, end_date, working_days, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");
$stmt->bind_param('iiisssis', $teacherId, $schoolId, $classId, $leaveType, $startDate, $endDate, $workingDays, $reason);
$stmt->execute();
$newId = $stmt->insert_id;
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'id' => $newId, 'working_days' => $workingDays]);