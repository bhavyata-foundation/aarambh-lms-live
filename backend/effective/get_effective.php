<?php
// =========================================================================
// GET EFFECTIVE (APPROVAL STATUS) — called from the teacher's Monthly
// Effective screen to check whether this month's submission is pending,
// approved, or rejected. Returns approval_status = 'none' if she hasn't
// submitted this month yet at all (distinct from 'pending', which means
// submitted and waiting).
//
// Same connection pattern as get_my_class.php — db_config.php provides
// get_db_connection(), a mysqli connection, not PDO.
//
// DEV BYPASS — same pattern as get_my_class.php / session_check.php.
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

$classId = filter_var($_GET['class_id'] ?? null, FILTER_VALIDATE_INT);
$year    = filter_var($_GET['year'] ?? null, FILTER_VALIDATE_INT);
$month   = filter_var($_GET['month'] ?? null, FILTER_VALIDATE_INT); // 0-11

if ($classId === false || $classId === null
    || $year === false || $year === null
    || $month === false || $month === null || $month < 0 || $month > 11) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid fields.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$stmt = $conn->prepare(
    'SELECT status, teacher_attendance_pct, supervisor_note, submitted_at, decided_at
     FROM effective_approvals
     WHERE class_id = ? AND year = ? AND month = ?
     LIMIT 1'
);
$stmt->bind_param('iii', $classId, $year, $month);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();

$stmt->close();
$conn->close();

if (!$row) {
    echo json_encode(['status' => 'success', 'approval_status' => 'none']);
    exit;
}

echo json_encode([
    'status'                 => 'success',
    'approval_status'        => $row['status'], // 'pending' | 'approved' | 'rejected'
    'teacher_attendance_pct' => (float)$row['teacher_attendance_pct'],
    'supervisor_note'        => $row['supervisor_note'],
    'submitted_at'           => $row['submitted_at'],
    'decided_at'             => $row['decided_at'],
]);
?>