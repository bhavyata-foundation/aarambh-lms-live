<?php
// Undoes a term's Viva submission — deletes the
// status row entirely, same "Undo" pattern already used elsewhere in
// this app (e.g. Monthly Effective's sign-off steps).

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

$input = json_decode(file_get_contents('php://input'), true);
$classId = filter_var($input['class_id'] ?? null, FILTER_VALIDATE_INT);
$term = trim((string) ($input['term'] ?? ''));
if (!$classId || $term === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'class_id and term are required.']);
    exit;
}

require_once __DIR__ . '/../../users/db_config.php';
$conn = get_db_connection();

$stmt = $conn->prepare("DELETE FROM viva_term_submissions WHERE class_id = ? AND term = ?");
$stmt->bind_param('is', $classId, $term);
$stmt->execute();
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success']);