<?php
// =========================================================================
// CHECK DRIVE STATUS — lets the frontend show real connection state
// (Connected / Not connected) instead of only finding out reactively
// when an upload fails.
//
// Same mysqli connection pattern as get_my_class.php.
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

$teacherUserId = $_SESSION['user_id'] ?? ($devRole ? 49 : null);
if (!$teacherUserId) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Could not determine which teacher this is.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$stmt = $conn->prepare('SELECT updated_at FROM google_drive_tokens WHERE teacher_user_id = ?');
$stmt->bind_param('i', $teacherUserId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();
$conn->close();

echo json_encode([
    'status' => 'success',
    'connected' => $row !== null,
    'connected_since' => $row['updated_at'] ?? null,
]);