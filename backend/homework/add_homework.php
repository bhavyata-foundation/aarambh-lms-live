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
// ADD HOMEWORK — a whole-class assignment (title, description, due
// date, and an optional photo/worksheet already uploaded to Drive via
// upload_to_drive.php on the frontend before this call). Not per-pupil
// — every child in the class gets the same assignment, same as how
// materials/add_materials.php works for the class as a whole.
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
$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$dueDate = trim($input['due_date'] ?? '');
$driveFileId = trim($input['drive_file_id'] ?? '');
$driveLink = trim($input['drive_link'] ?? '');

if ($title === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'A title is required.']);
    exit;
}
if ($dueDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dueDate)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Due date must be in YYYY-MM-DD format.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

// Same session-else-dev-fallback pattern as add_materials.php.
// The logged-in teacher only — never a guessed teacher (users/teacher_auth.php).
require_once __DIR__ . '/../users/teacher_auth.php';
$teacherId = current_teacher_id();

require_once __DIR__ . '/../users/teacher_class.php';
$classRow = teacher_active_class($conn, (int) $teacherId); // the class she is working in (class switch)

if (!$classRow) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Your account is not linked to a class yet — ask your admin to link it.']);
    exit;
}

$dueDateParam = $dueDate !== '' ? $dueDate : null;

$stmt = $conn->prepare("
    INSERT INTO homework (class_id, title, description, due_date, drive_file_id, drive_link, teacher_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
");
$stmt->bind_param(
    'isssssi',
    $classRow['id'], $title, $description, $dueDateParam, $driveFileId, $driveLink, $teacherId
);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'homework_id' => $conn->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $stmt->error]);
}

$stmt->close();
$conn->close();
?>