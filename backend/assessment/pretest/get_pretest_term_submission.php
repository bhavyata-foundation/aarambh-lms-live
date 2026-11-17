<?php
// Whether a class's Pre-Test term has been submitted, and by whom and when.
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
$classId = filter_var($_GET['class_id'] ?? null, FILTER_VALIDATE_INT);
$term = strtoupper(trim((string) ($_GET['term'] ?? '')));
if (!$classId || $term === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'class_id and term are required.']);
    exit;
}
require_once __DIR__ . '/../../users/db_config.php';
$conn = get_db_connection();
$conn->query("CREATE TABLE IF NOT EXISTS pretest_term_submissions (class_id INT NOT NULL, term VARCHAR(20) NOT NULL, submitted_by INT NULL, submitted_at DATETIME NULL, PRIMARY KEY (class_id, term))");
$stmt = $conn->prepare(
    "SELECT pts.submitted_at, u.name AS submitted_by_name
     FROM pretest_term_submissions pts
     LEFT JOIN users u ON u.id = pts.submitted_by
     WHERE pts.class_id = ? AND pts.term = ?
     LIMIT 1"
);
$stmt->bind_param('is', $classId, $term);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();
$conn->close();
if (!$row) { echo json_encode(['status' => 'success', 'submitted' => false]); exit; }
echo json_encode(['status' => 'success', 'submitted' => true, 'submitted_at' => $row['submitted_at'], 'submitted_by_name' => $row['submitted_by_name']]);
