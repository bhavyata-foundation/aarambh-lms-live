<?php
// ============================================================
// RAISE A FLAG — supervisor raises an Observation, Concern or
// For-escalation flag against a teacher. The reply due date is set
// here, never by the browser: Concern +7 days, For escalation +3
// days, Observation none.
// File: backend/flags/raise_flag.php
// POST JSON: { teacher_user_id, class_id, state, text }
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

// Same role / user-id / error helpers the leave endpoints use.
require_once __DIR__ . '/../teacher_leave/leave_helpers.php';

if (leave_effective_role() !== 'supervisor') leave_json_error(401, 'Not authorized.');

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$teacherId = filter_var($input['teacher_user_id'] ?? null, FILTER_VALIDATE_INT);
$classId   = filter_var($input['class_id'] ?? null, FILTER_VALIDATE_INT);
$state     = $input['state'] ?? '';
$text      = trim((string)($input['text'] ?? ''));

if (!$teacherId || !$classId) leave_json_error(400, 'Choose a teacher.');
if (!in_array($state, ['observation', 'concern', 'escalation'], true)) leave_json_error(400, 'Choose what kind of flag this is.');
if ($text === '') leave_json_error(400, 'Write what was noted.');

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();
$supervisorId = leave_user_id($conn, 'supervisor');
if (!$supervisorId) leave_json_error(401, 'Could not determine supervisor.');

// The class must really belong to that teacher.
$stmt = $conn->prepare("SELECT school_id FROM classes WHERE id = ? AND teacher_user_id = ? LIMIT 1");
$stmt->bind_param('ii', $classId, $teacherId);
$stmt->execute();
$class = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$class) { $conn->close(); leave_json_error(404, 'That teacher and class do not match.'); }
$schoolId = $class['school_id'] !== null ? (int) $class['school_id'] : null;

$today = date('Y-m-d');
$dueDate = null;
if ($state === 'concern')    $dueDate = date('Y-m-d', strtotime('+7 days'));
if ($state === 'escalation') $dueDate = date('Y-m-d', strtotime('+3 days'));

$stmt = $conn->prepare("
    INSERT INTO teacher_flags (teacher_user_id, school_id, class_id, raised_by_user_id, state, text, date_raised, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");
$stmt->bind_param('iiiissss', $teacherId, $schoolId, $classId, $supervisorId, $state, $text, $today, $dueDate);
$stmt->execute();
$newId = $stmt->insert_id;
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'id' => $newId, 'due_date' => $dueDate]);