<?php
// =========================================================================
// GET MY SCHOOL — resolves the logged-in principal's own school from
// her session, same pattern as get_my_class.php does for teachers
// (session/dev-role → user id → real row, never trusted from the
// client). This file didn't exist before — principal.js was calling
// it, but nothing on the server ever answered.
//
// ASSUMPTION: schools has a principal_user_id column, the same shape
// as classes.teacher_user_id. If that column doesn't exist yet, this
// needs a migration adding it before this endpoint can return anything
// real — flagging this rather than silently returning empty data.
// =========================================================================

session_start();
header('Content-Type: application/json');

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'principal') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

if (isset($_SESSION['user_id'])) {
    $principalId = $_SESSION['user_id'];
} else {
    $lookup = $conn->query("SELECT id FROM users WHERE role = 'principal' ORDER BY id LIMIT 1");
    $row = $lookup ? $lookup->fetch_assoc() : null;
    $principalId = $row ? $row['id'] : null;
}

if (!$principalId) {
    echo json_encode(['status' => 'success', 'school' => null]);
    exit;
}

$stmt = $conn->prepare("SELECT id, name FROM schools WHERE principal_user_id = ? LIMIT 1");
$stmt->bind_param('i', $principalId);
$stmt->execute();
$school = $stmt->get_result()->fetch_assoc();
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'school' => $school ?: null]);
?>
