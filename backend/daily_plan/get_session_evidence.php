<?php
// ============================================================
// GET SESSION EVIDENCE
// Returns every uploaded evidence record for a class + week.
// File: backend/daily_plan/get_session_evidence.php
// ============================================================

session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

set_exception_handler(function ($e) {
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

$classId    = filter_var($_GET['class_id'] ?? null, FILTER_VALIDATE_INT);
$weekNumber = filter_var($_GET['week_number'] ?? null, FILTER_VALIDATE_INT);

if (!$classId || !$weekNumber) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'class_id and week_number are required.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

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
    "SELECT id, day, domain_key, file_name, file_size, file_type, drive_file_id, drive_link, uploaded_at
     FROM session_evidence
     WHERE class_id = ? AND week_id = ?
     ORDER BY uploaded_at ASC"
);
$stmt->bind_param('ii', $classId, $weekId);
$stmt->execute();
$result = $stmt->get_result();

$evidence = [];
while ($row = $result->fetch_assoc()) {
    $key = $row['day'] . '-' . $row['domain_key'];
    if (!isset($evidence[$key])) $evidence[$key] = [];
    $evidence[$key][] = [
        'id'           => (int) $row['id'],
        'name'         => $row['file_name'],
        'size'         => (int) $row['file_size'],
        'type'         => $row['file_type'],
        'driveFileId'  => $row['drive_file_id'],
        'driveLink'    => $row['drive_link'],
        'uploadedAt'   => $row['uploaded_at']
    ];
}
$stmt->close();
$conn->close();

echo json_encode([
    'status' => 'success',
    'evidence' => $evidence
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);