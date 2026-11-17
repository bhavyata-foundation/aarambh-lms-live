<?php
// TESTING-ONLY ENDPOINT — deletes the real approval row for a class/
// year/month, so the submit → supervisor-approve → sign-off workflow
// can be tested from a clean slate repeatedly. Remove or lock this
// down before going live: a real teacher being able to erase a real
// supervisor decision is not something the production app should allow.
//
// month is stored 0-based in effective_approvals (matches the JS Date
// convention used everywhere else in this app, and exactly how
// get_effective.php/submit_effective.php already read/write it) — no
// +1 adjustment here.

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

$classId = filter_var($input['class_id'] ?? null, FILTER_VALIDATE_INT);
$year    = filter_var($input['year'] ?? null, FILTER_VALIDATE_INT);
$month   = filter_var($input['month'] ?? null, FILTER_VALIDATE_INT); // 0-11

if ($classId === false || $classId === null
    || $year === false || $year === null
    || $month === false || $month === null || $month < 0 || $month > 11) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid fields.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$stmt = $conn->prepare('DELETE FROM effective_approvals WHERE class_id = ? AND year = ? AND month = ?');
$stmt->bind_param('iii', $classId, $year, $month);
$stmt->execute();
$deleted = $stmt->affected_rows;

$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'deleted' => $deleted]);
?>