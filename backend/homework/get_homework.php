<?php
// =========================================================================
// GET HOMEWORK — every homework assignment for the teacher's class,
// most recent first. Same mysqli connection pattern as get_attendance.php.
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
if ($classId === false || $classId === null) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'class_id is required.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$stmt = $conn->prepare(
    "SELECT id, title, description, due_date, drive_file_id, drive_link, created_at
     FROM homework
     WHERE class_id = ?
     ORDER BY created_at DESC"
);
$stmt->bind_param('i', $classId);
$stmt->execute();
$result = $stmt->get_result();

$homework = [];
while ($row = $result->fetch_assoc()) {
    $homework[] = $row;
}
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'homework' => $homework]);
?>