<?php
// Marks an entire month's Workbook Assessment tally as submitted —
// covers every workbook at once (Khelika, Vaani, Sopanika, etc.), not
// per-book. A pure status flag: submitting does NOT lock the numbers
// themselves — they stay editable in the table regardless, exactly
// like every other cell already does. Re-submitting the same month
// just refreshes who/when (ON DUPLICATE KEY UPDATE), so this never
// creates duplicate rows for the same class+month.

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
$classId = filter_var($input['class_id'] ?? null, FILTER_VALIDATE_INT);
$month = trim((string) ($input['month'] ?? ''));
if (!$classId || $month === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'class_id and month are required.']);
    exit;
}

require_once __DIR__ . '/../../users/db_config.php';
$conn = get_db_connection();

$stmt = $conn->prepare(
    "INSERT INTO workbook_month_submissions (class_id, month, submitted_by, submitted_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE submitted_by = VALUES(submitted_by), submitted_at = NOW()"
);
$stmt->bind_param('isi', $classId, $month, $teacherId);
$stmt->execute();
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success']);