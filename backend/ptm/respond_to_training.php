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
// RESPOND TO TRAINING — the teacher's half of "supervisor decides
// training, but there should be a confirming alert checking her
// availability." She can mark a proposed training as confirmed or
// declined; supervisor/superadmin see the result via get_events.php's
// status column.
// =========================================================================

session_start();
header('Content-Type: application/json');

$isLocalRequest = in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1', 'localhost:80', '127.0.0.1:80']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'teacher') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Only a teacher can respond to a training.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$eventId = $input['event_id'] ?? null;
$response = $input['response'] ?? '';

if (!$eventId || !in_array($response, ['confirmed', 'declined'], true)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'event_id and a response of confirmed or declined are both required.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$stmt = $conn->prepare("UPDATE events SET status = ? WHERE id = ? AND event_type IN ('Teacher Training', 'Workshop')");
$stmt->bind_param('si', $response, $eventId);
$stmt->execute();
$updated = $stmt->affected_rows > 0;
$stmt->close();
$conn->close();

if (!$updated) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'That training was not found, or isn\'t a type that needs a response.']);
    exit;
}

echo json_encode(['status' => 'success']);
?>