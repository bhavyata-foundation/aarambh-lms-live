<?php
// =========================================================================
// SUBMIT EFFECTIVE (FOR APPROVAL) — called from the teacher's Monthly
// Effective screen. Records her attendance figure for this month as a
// 'pending' row for the foundation/supervisor to review. Re-submitting
// (e.g. she corrected a number) resets status back to 'pending' and
// clears any prior decision.
//
// Same connection pattern as get_my_class.php — db_config.php provides
// get_db_connection(), a mysqli connection, not PDO.
//
// DEV BYPASS — same pattern as get_my_class.php: no real $_SESSION
// user_id under ?dev_role=teacher, so this falls back to the same
// hardcoded teacher (49) get_my_class.php uses for local testing.
// =========================================================================

session_start();
header('Content-Type: application/json');

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'teacher') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];

$schoolId = filter_var($input['school_id'] ?? null, FILTER_VALIDATE_INT);
$classId  = filter_var($input['class_id'] ?? null, FILTER_VALIDATE_INT);
$year     = filter_var($input['year'] ?? null, FILTER_VALIDATE_INT);
$month    = filter_var($input['month'] ?? null, FILTER_VALIDATE_INT); // 0-11
$pct      = filter_var($input['teacher_attendance_pct'] ?? null, FILTER_VALIDATE_FLOAT);

if ($schoolId === false || $schoolId === null
    || $classId === false || $classId === null
    || $year === false || $year === null
    || $month === false || $month === null || $month < 0 || $month > 11
    || $pct === false || $pct === null || $pct < 0 || $pct > 100) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid fields.']);
    exit;
}

// The logged-in teacher only — never a guessed teacher (users/teacher_auth.php).
require_once __DIR__ . '/../users/teacher_auth.php';
$teacherUserId = current_teacher_id();

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$stmt = $conn->prepare(
    'INSERT INTO effective_approvals
        (school_id, class_id, teacher_user_id, year, month, teacher_attendance_pct, status, submitted_at)
     VALUES
        (?, ?, ?, ?, ?, ?, "pending", NOW())
     ON DUPLICATE KEY UPDATE
        teacher_attendance_pct = VALUES(teacher_attendance_pct),
        status = "pending",
        supervisor_user_id = NULL,
        supervisor_note = NULL,
        submitted_at = NOW(),
        decided_at = NULL'
);
$stmt->bind_param('iiiiid', $schoolId, $classId, $teacherUserId, $year, $month, $pct);
$ok = $stmt->execute();

$stmt->close();
$conn->close();

if (!$ok) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not save the submission.']);
    exit;
}

echo json_encode(['status' => 'success']);
?>