<?php
// ============================================================
// DECIDE LEAVE — the supervisor or the principal approves/rejects.
//   - Either one rejecting  → request becomes 'rejected'.
//   - Both approving        → request becomes 'approved', and every
//     working day in the range is written to teacher_attendance
//     with status 'leave' (a day already marked 'present' is kept
//     as present — she was actually there).
// File: backend/teacher_leave/decide_leave.php
// POST JSON: { leave_id, decision: 'approved'|'rejected', note }
// ============================================================

session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');
set_exception_handler(function($e){
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error.']);
    exit;
});

require_once __DIR__ . '/leave_helpers.php';
$role = leave_effective_role();
if (!in_array($role, ['supervisor', 'principal'], true)) leave_json_error(401, 'Not authorized.');

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$leaveId  = filter_var($input['leave_id'] ?? null, FILTER_VALIDATE_INT);
$decision = $input['decision'] ?? '';
$note     = trim((string)($input['note'] ?? ''));

if (!$leaveId || !in_array($decision, ['approved', 'rejected'], true)) leave_json_error(400, 'Missing or invalid fields.');
if ($decision === 'rejected' && $note === '') leave_json_error(400, 'A note is required when rejecting, so the teacher knows why.');

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();
$deciderId = leave_user_id($conn, $role);

$conn->begin_transaction();

$stmt = $conn->prepare("
    SELECT lr.*, s.principal_user_id AS school_principal_id
    FROM teacher_leave_requests lr
    LEFT JOIN schools s ON s.id = lr.school_id
    WHERE lr.id = ? FOR UPDATE
");
$stmt->bind_param('i', $leaveId);
$stmt->execute();
$leave = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$leave) { $conn->rollback(); leave_json_error(404, 'Leave request not found.'); }
if ($leave['status'] !== 'pending') { $conn->rollback(); leave_json_error(409, 'This request has already been decided or cancelled.'); }

$col = $role === 'principal' ? 'principal' : 'supervisor';
if ($leave[$col . '_status'] !== 'pending') { $conn->rollback(); leave_json_error(409, 'You have already decided this request.'); }
if ($role === 'principal' && (int) $leave['school_principal_id'] !== (int) $deciderId) {
    $conn->rollback(); leave_json_error(403, 'This teacher is not in your school.');
}

// Record this role's decision.
$sql = "UPDATE teacher_leave_requests SET {$col}_status = ?, {$col}_user_id = ?, {$col}_note = ?, {$col}_decided_at = NOW() WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param('sisi', $decision, $deciderId, $note, $leaveId);
$stmt->execute();
$stmt->close();

$supStatus = $col === 'supervisor' ? $decision : $leave['supervisor_status'];
$priStatus = $col === 'principal'  ? $decision : $leave['principal_status'];

$final = 'pending';
if ($supStatus === 'rejected' || $priStatus === 'rejected') $final = 'rejected';
elseif ($supStatus === 'approved' && $priStatus === 'approved') $final = 'approved';

$daysWritten = 0;
if ($final !== 'pending') {
    $stmt = $conn->prepare("UPDATE teacher_leave_requests SET status = ? WHERE id = ?");
    $stmt->bind_param('si', $final, $leaveId);
    $stmt->execute();
    $stmt->close();
}

if ($final === 'approved') {
    $teacherId = (int) $leave['teacher_user_id'];
    $stmt = $conn->prepare("
        INSERT INTO teacher_attendance (teacher_user_id, date, status, marked_at)
        VALUES (?, ?, 'leave', NOW())
        ON DUPLICATE KEY UPDATE status = IF(status = 'present', 'present', 'leave')
    ");
    foreach (leave_working_dates($leave['start_date'], $leave['end_date']) as $d) {
        $stmt->bind_param('is', $teacherId, $d);
        $stmt->execute();
        $daysWritten++;
    }
    $stmt->close();
}

$conn->commit();
$conn->close();

echo json_encode(['status' => 'success', 'final_status' => $final, 'days_written' => $daysWritten]);