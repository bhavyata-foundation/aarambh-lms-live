<?php
// ============================================================
// SAVE SESSION EVIDENCE
// Records one uploaded photo's metadata against a session,
// AFTER the file itself has already been uploaded to Drive.
// File: backend/daily_plan/save_session_evidence.php
// ============================================================

session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

// Errors are logged, never shown to the browser (the old TEMP debug
// setting printed full server errors to anyone).
set_exception_handler(function ($e) {
    error_log('save_session_evidence: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error.']);
    exit;
});

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'teacher') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}

$teacherId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : ($devRole ? 49 : null);
if (!$teacherId) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Could not determine teacher.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$classId    = filter_var($input['class_id'] ?? null, FILTER_VALIDATE_INT);
$weekNumber = filter_var($input['week_number'] ?? null, FILTER_VALIDATE_INT);
$day        = $input['day'] ?? null;
$domainKey  = $input['domain_key'] ?? null;
$fileName   = $input['file_name'] ?? null;
$fileSize   = filter_var($input['file_size'] ?? null, FILTER_VALIDATE_INT);
$fileType   = $input['file_type'] ?? null;
$driveFileId = $input['drive_file_id'] ?? null;
$driveLink   = $input['drive_link'] ?? null;

if (!$classId || !$weekNumber || !$day || !$domainKey || !$fileName || !$driveFileId || !$driveLink) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing required fields.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

// Verify class belongs to teacher
$stmt = $conn->prepare("SELECT id FROM classes WHERE id = ? AND teacher_user_id = ? LIMIT 1");
$stmt->bind_param('ii', $classId, $teacherId);
$stmt->execute();
$class = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$class) {
    $conn->close();
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'This class does not belong to the logged-in teacher.']);
    exit;
}

// Resolve week_id
$stmt = $conn->prepare("SELECT id FROM weeks WHERE week_number = ? ORDER BY start_date DESC, id DESC LIMIT 1");
$stmt->bind_param('i', $weekNumber);
$stmt->execute();
$week = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$week) {
    $conn->close();
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Week not found.']);
    exit;
}
$weekId = (int) $week['id'];

$stmt = $conn->prepare(
    "INSERT INTO session_evidence
        (class_id, week_id, day, domain_key, file_name, file_size, file_type, drive_file_id, drive_link, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
$stmt->bind_param(
    'iisssisssi',
    $classId, $weekId, $day, $domainKey, $fileName, $fileSize, $fileType, $driveFileId, $driveLink, $teacherId
);
$stmt->execute();
$newId = $stmt->insert_id;
$stmt->close();
$conn->close();

echo json_encode([
    'status' => 'success',
    'message' => 'Evidence saved.',
    'evidence' => ['id' => $newId]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);