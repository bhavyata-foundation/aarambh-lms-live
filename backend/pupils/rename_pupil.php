<?php
// =========================================================================
// RENAME PUPIL — corrects ONLY a child's name (nothing else is touched).
// POST JSON { pupil_id, name, class_id? }  → { status, pupil_id, name }
// Used by the class-list import when the teacher corrects a spelling.
// Same login rule as update_pupil.php: a teacher, and only a child of a
// class she teaches. Marks, attendance and records stay with the child (by id).
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
$name = trim((string)($input['name'] ?? ''));
if (!$pupilId || $name === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'pupil_id and name are required.']);
    exit;
}
require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/pupil_helpers.php';
$conn = get_db_connection();
$class = pupil_authorized_class($conn, $input['class_id'] ?? null);
$name = pupil_clean_name($name);
if ($name === '' || $name === null) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'That name is empty after tidying.']);
    exit;
}
$stmt = $conn->prepare('UPDATE pupils SET name = ? WHERE id = ? AND class_id = ?');
$stmt->bind_param('sii', $name, $pupilId, $class['id']);
$ok = $stmt->execute();
$changed = $stmt->affected_rows;
$stmt->close();
$conn->close();
if (!$ok) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not save the name.']);
    exit;
}
echo json_encode(['status' => 'success', 'pupil_id' => $pupilId, 'name' => $name, 'changed' => $changed > 0]);