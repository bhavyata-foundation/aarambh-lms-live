<?php
// =========================================================================
// GET TEACHER ATTENDANCE — returns the logged-in teacher's own real
// attendance marks for a given month, as
//   { "YYYY-MM-DD": { "status": "present"|"absent", "marked_at": "..." } }
// — the same shape teacher.js's in-memory teacherAttendanceRecords cache
// already expects, mirroring how get_attendance.php's per-pupil records
// slot straight into attendanceRecords.
//
// Scoped to the logged-in teacher only (no teacher_user_id override param) —
// this table holds a teacher's OWN attendance, not something another
// role should be able to query for someone else through this endpoint.
//
// Same mysqli connection pattern as get_attendance.php / add_materials.php.
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

$year  = filter_var($_GET['year'] ?? null, FILTER_VALIDATE_INT);
$month = filter_var($_GET['month'] ?? null, FILTER_VALIDATE_INT); // 0-11, JS convention, matching get_attendance.php

if ($year === false || $year === null || $month === false || $month === null || $month < 0 || $month > 11) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid fields.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

// Same session-else-dev-fallback pattern as add_materials.php /
// mark_teacher_attendance.php — keeps this endpoint usable in the
// dev-bypass flow (no session) as well as a real login.
if (isset($_SESSION['user_id'])) {
    $teacherId = $_SESSION['user_id'];
} else {
    $lookup = $conn->query("SELECT id FROM users WHERE role = 'teacher' ORDER BY id LIMIT 1");
    $row = $lookup ? $lookup->fetch_assoc() : null;
    if (!$row) {
        echo json_encode(['status' => 'success', 'records' => []]); // no teacher account yet — nothing to return, not an error
        exit;
    }
    $teacherId = $row['id'];
}

$monthNum = $month + 1; // MySQL months are 1-12
$stmt = $conn->prepare(
    "SELECT date, status, marked_at
     FROM teacher_attendance
     WHERE teacher_user_id = ? AND YEAR(date) = ? AND MONTH(date) = ?"
);
$stmt->bind_param('iii', $teacherId, $year, $monthNum);
$stmt->execute();
$result = $stmt->get_result();

$records = [];
while ($row = $result->fetch_assoc()) {
    $records[$row['date']] = [
        'status' => $row['status'],
        'marked_at' => $row['marked_at']
    ];
}
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'records' => $records]);
?>