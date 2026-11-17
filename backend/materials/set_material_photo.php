<?php
// =========================================================================
// SET MATERIAL PHOTO — attaches (or replaces) the Drive photo link on an
// already-existing material row. The actual file upload happens via the
// existing upload_to_drive.php first (same as a brand-new material) —
// this endpoint just saves the resulting file_id/link onto a row that
// already exists, for materials logged before the photo feature did.
//
// Passing drive_file_id/drive_link as empty strings CLEARS them instead
// (sets both to NULL) — used when removing a photo, after the actual
// file has already been deleted from Drive via delete_from_drive.php.
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
$materialId = isset($input['material_id']) ? (int)$input['material_id'] : null;
$driveFileId = trim($input['drive_file_id'] ?? '');
$driveLink = trim($input['drive_link'] ?? '');
$isClear = $driveFileId === '' && $driveLink === '';

if (!$materialId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'material_id is required.']);
    exit;
}
if (!$isClear && ($driveFileId === '' || $driveLink === '')) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'drive_file_id and drive_link must both be set, or both left blank to clear.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../users/teacher_auth.php';
$conn = get_db_connection();

// Logged-in teacher only — never a guessed teacher (see users/teacher_auth.php).
$teacherId = current_teacher_id();

// Same ownership check pattern as everywhere else — a teacher can only
// attach a photo to a material that belongs to her own class.
$stmt = $conn->prepare('SELECT 1 FROM materials m JOIN classes c ON c.id = m.class_id WHERE m.id = ? AND c.teacher_user_id = ?');
$stmt->bind_param('ii', $materialId, $teacherId);
$stmt->execute();
$owns = $stmt->get_result()->num_rows > 0;
$stmt->close();

if (!$owns) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'That material is not in your class.']);
    exit;
}

if ($isClear) {
    $stmt = $conn->prepare('UPDATE materials SET drive_file_id = NULL, drive_link = NULL WHERE id = ?');
    $stmt->bind_param('i', $materialId);
} else {
    $stmt = $conn->prepare('UPDATE materials SET drive_file_id = ?, drive_link = ? WHERE id = ?');
    $stmt->bind_param('ssi', $driveFileId, $driveLink, $materialId);
}
$stmt->execute();
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success']);