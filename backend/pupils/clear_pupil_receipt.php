<?php
// =========================================================================
// CLEAR PUPIL RECEIPT — sets receipt_drive_link/receipt_drive_file_id
// back to NULL for one pupil. Separate from update_pupil.php on
// purpose: that endpoint uses COALESCE so editing unrelated fields
// never accidentally wipes an existing receipt, which means it has no
// way to explicitly clear one. This is that explicit path — used when
// the referenced file no longer exists in Drive (deleted outside the app).
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

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$pupilId = filter_var($input['pupil_id'] ?? null, FILTER_VALIDATE_INT);
if ($pupilId === false || $pupilId === null) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid pupil_id.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$stmt = $conn->prepare('UPDATE pupils SET receipt_drive_link = NULL, receipt_drive_file_id = NULL WHERE id = ?');
$stmt->bind_param('i', $pupilId);
$ok = $stmt->execute();
$stmt->close();
$conn->close();

echo json_encode(['status' => $ok ? 'success' : 'error']);