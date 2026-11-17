<?php
// Reports whether a given class+month's Workbook Assessment has been
// submitted, and if so, by whom and when — read by the teacher screen
// to decide whether to show "Not yet submitted" or the real submitted
// status, and whether the download section unlocks.

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
$month = trim((string) ($_GET['month'] ?? ''));
if (!$classId || $month === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'class_id and month are required.']);
    exit;
}

require_once __DIR__ . '/../../users/db_config.php';
$conn = get_db_connection();

$stmt = $conn->prepare(
    "SELECT wms.submitted_at, u.name AS submitted_by_name
     FROM workbook_month_submissions wms
     LEFT JOIN users u ON u.id = wms.submitted_by
     WHERE wms.class_id = ? AND wms.month = ?
     LIMIT 1"
);
$stmt->bind_param('is', $classId, $month);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();
$conn->close();

if (!$row) {
    echo json_encode(['status' => 'success', 'submitted' => false]);
    exit;
}

echo json_encode([
    'status' => 'success',
    'submitted' => true,
    'submitted_at' => $row['submitted_at'],
    'submitted_by_name' => $row['submitted_by_name'],
]);