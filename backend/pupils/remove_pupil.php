<?php
// =========================================================================
// REMOVE PUPIL — soft-delete only (sets active = 0), never a real SQL
// DELETE. A child who's left the school, was added by mistake, or
// transferred out should stop appearing on the register — but her
// past attendance/assessment history shouldn't vanish along with her,
// and undoing an accidental removal should be possible by flipping
// active back to 1 in phpMyAdmin, not by re-entering everything.
//
// Same mysqli connection pattern as get_my_class.php.
// =========================================================================

session_start();
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$pupilId = filter_var($input['pupil_id'] ?? null, FILTER_VALIDATE_INT);

if ($pupilId === false || $pupilId === null) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid pupil_id.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/pupil_helpers.php';
$conn = get_db_connection();
$class = pupil_authorized_class($conn, $input['class_id'] ?? null);

$stmt = $conn->prepare('UPDATE pupils SET active = 0 WHERE id = ? AND class_id = ? AND active = 1');
$stmt->bind_param('ii', $pupilId, $class['id']);
$ok = $stmt->execute();
$affected = $stmt->affected_rows;
$stmt->close();
$conn->close();

if (!$ok) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not remove this pupil.']);
    exit;
}

if ($affected === 0) {
    echo json_encode(['status' => 'error', 'message' => 'No pupil found with that id, or she was already removed.']);
    exit;
}

echo json_encode(['status' => 'success']);
