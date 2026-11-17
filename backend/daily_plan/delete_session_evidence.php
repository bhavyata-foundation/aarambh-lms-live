<?php
// ============================================================
// DELETE SESSION EVIDENCE ROW
// Called AFTER the file has already been deleted from Drive.
// File: backend/daily_plan/delete_session_evidence.php
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

$input = json_decode(file_get_contents('php://input'), true);
$evidenceId = filter_var($input['evidence_id'] ?? null, FILTER_VALIDATE_INT);

if (!$evidenceId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'evidence_id is required.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

// Only allow deleting evidence belonging to a class this teacher owns.
$stmt = $conn->prepare(
    "DELETE se FROM session_evidence se
     JOIN classes c ON c.id = se.class_id
     WHERE se.id = ? AND c.teacher_user_id = ?"
);
$stmt->bind_param('ii', $evidenceId, $teacherId);
$stmt->execute();
$deleted = $stmt->affected_rows > 0;
$stmt->close();
$conn->close();

echo json_encode([
    'status' => $deleted ? 'success' : 'error',
    'message' => $deleted ? 'Deleted.' : 'Not found or not yours.'
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);