<?php
// =========================================================================
// Shared by get_student_holidays.php, save_student_holiday.php and
// delete_student_holiday.php.
//
// Holidays are for the WHOLE CLASS (pupil_id = NULL) — that is what the
// register calendar and the register import save. A holiday for one child
// only (pupil_id set) is still possible if a screen sends a pupil_id.
// Only the logged-in teacher (users/teacher_auth.php), only her own class.
// =========================================================================
session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');
set_exception_handler(function ($e) {
    error_log('student holidays: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error.']);
    exit;
});

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../users/teacher_auth.php';

function holidays_fail($code, $message)
{
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

function holidays_teacher()
{
    $devRole = (teacher_auth_is_local() && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
    if (($_SESSION['role'] ?? $devRole) !== 'teacher') holidays_fail(401, 'Not authorized.');
    return current_teacher_id();
}

function holidays_own_class($conn, $teacherId, $classId)
{
    $classId = filter_var($classId, FILTER_VALIDATE_INT);
    if (!$classId) holidays_fail(400, 'class_id is required.');
    $stmt = $conn->prepare('SELECT id FROM classes WHERE id = ? AND teacher_user_id = ? LIMIT 1');
    $stmt->bind_param('ii', $classId, $teacherId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) holidays_fail(403, 'This class does not belong to the logged-in teacher.');
    return (int) $classId;
}

// null = whole class. A pupil_id, if sent, must be a child in this class.
function holidays_pupil($conn, $classId, $pupilId)
{
    if ($pupilId === null || $pupilId === '' || $pupilId === false) return null;
    $pupilId = filter_var($pupilId, FILTER_VALIDATE_INT);
    if (!$pupilId) holidays_fail(400, 'pupil_id must be a number.');
    $stmt = $conn->prepare('SELECT id FROM pupils WHERE id = ? AND class_id = ? LIMIT 1');
    $stmt->bind_param('ii', $pupilId, $classId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) holidays_fail(403, 'This pupil does not belong to the selected class.');
    return (int) $pupilId;
}

function holidays_valid_date($d)
{
    $d = trim((string) $d);
    $dt = DateTime::createFromFormat('!Y-m-d', $d);
    if (!$dt || $dt->format('Y-m-d') !== $d) holidays_fail(400, 'holiday_date must be a real date (YYYY-MM-DD).');
    return $d;
}
