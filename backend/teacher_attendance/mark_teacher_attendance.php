<?php
set_exception_handler(function($e){
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
});
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

// =========================================================================
// MARK TEACHER ATTENDANCE — a teacher marks herself present/absent for
// today (or, in principle, any date passed in). This is the real
// database-backed replacement for what teacher.js's
// saveTeacherAttendanceRecord() used to only write to localStorage.
//
//   Table: teacher_attendance
//   Columns: id, teacher_user_id, date, status ('present'|'absent'), marked_at
//   Constraint: UNIQUE (teacher_user_id, date) — one record per teacher per day
//
// Upserted via ON DUPLICATE KEY UPDATE so re-marking the same day (e.g.
// correcting a mistaken tap) updates the existing row instead of
// erroring on the unique constraint.
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

$input = json_decode(file_get_contents('php://input'), true);
$date = trim($input['date'] ?? '');
$status = trim($input['status'] ?? '');

if ($date === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'A valid date (YYYY-MM-DD) is required.']);
    exit;
}
if (!in_array($status, ['present', 'absent', 'leave'], true)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => "Status must be 'present', 'absent', or 'leave'."]);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

// Same session-else-dev-fallback pattern as add_materials.php: a real
// login always has user_id in the session; the dev-bypass path (no
// session) falls back to the first teacher account that exists, purely
// so this is testable locally without a full login flow.
if (isset($_SESSION['user_id'])) {
    $teacherId = $_SESSION['user_id'];
} else {
    $lookup = $conn->query("SELECT id FROM users WHERE role = 'teacher' ORDER BY id LIMIT 1");
    $row = $lookup ? $lookup->fetch_assoc() : null;
    if (!$row) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'No teacher account exists yet to attribute this to.']);
        exit;
    }
    $teacherId = $row['id'];
}

$stmt = $conn->prepare("
    INSERT INTO teacher_attendance (teacher_user_id, date, status, marked_at)
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE status = VALUES(status), marked_at = VALUES(marked_at)
");
$stmt->bind_param('iss', $teacherId, $date, $status);

if ($stmt->execute()) {
    // Read back the real marked_at (server time, not the client's clock)
    // so the frontend shows exactly what was actually stored.
    $readBack = $conn->prepare("SELECT marked_at FROM teacher_attendance WHERE teacher_user_id = ? AND date = ?");
    $readBack->bind_param('is', $teacherId, $date);
    $readBack->execute();
    $row = $readBack->get_result()->fetch_assoc();
    $readBack->close();

    echo json_encode([
        'status' => 'success',
        'record' => [
            'date' => $date,
            'status' => $status,
            'marked_at' => $row ? $row['marked_at'] : null
        ]
    ]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $stmt->error]);
}

$stmt->close();
$conn->close();
?>