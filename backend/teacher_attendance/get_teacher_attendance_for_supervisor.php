<?php
// =========================================================================
// GET TEACHER ATTENDANCE (SUPERVISOR VIEW) — real attendance records a
// teacher marks on her own dashboard (mark_teacher_attendance.php),
// viewed read-only by a supervisor for a specific class_id. The
// existing get_teacher_attendance.php only ever resolves "the
// logged-in teacher's own records" — this is the supervisor-facing
// counterpart, scoped to whichever real class she's looking at.
// =========================================================================

session_start();
header('Content-Type: application/json');

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'supervisor') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}

$classId = filter_var($_GET['class_id'] ?? null, FILTER_VALIDATE_INT);
if (!$classId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'class_id is required.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$classStmt = $conn->prepare("SELECT teacher_user_id FROM classes WHERE id = ? LIMIT 1");
$classStmt->bind_param('i', $classId);
$classStmt->execute();
$classRow = $classStmt->get_result()->fetch_assoc();
$classStmt->close();

if (!$classRow || !$classRow['teacher_user_id']) {
    echo json_encode(['status' => 'success', 'records' => []]);
    exit;
}
$teacherUserId = $classRow['teacher_user_id'];

$stmt = $conn->prepare("
    SELECT date, status, marked_at
    FROM teacher_attendance
    WHERE teacher_user_id = ?
    ORDER BY date DESC
    LIMIT 90
");
$stmt->bind_param('i', $teacherUserId);
$stmt->execute();
$result = $stmt->get_result();

$records = [];
while ($row = $result->fetch_assoc()) {
    $records[] = $row;
}
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'records' => $records]);
?>
