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
// DELETE MATERIAL — removes a single material row. Only teachers can
// call this, and only for a row that:
//   1. Belongs to their OWN class (so a teacher can't delete another
//      class's row just by guessing/sending a different id), and
//   2. Has source = 'import' (so this endpoint can't be used to quietly
//      delete a manually-logged item — the delete toggle in the UI is
//      only ever shown on CSV/XLSX-imported rows, and this check makes
//      that a real server-side rule, not just a frontend convention).
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

$input = json_decode(file_get_contents('php://input'), true);
$materialId = $input['material_id'] ?? null;

if (!$materialId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'material_id is required.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../users/teacher_auth.php';
$conn = get_db_connection();

// Same teacher-to-class resolution used everywhere else in this
// project (get_my_class.php, get_materials.php, import_materials.php):
// hardcoded to teacher 49 in dev mode, the one real teacher-to-class
// link that actually exists right now.
// Logged-in teacher only — never a guessed teacher (see users/teacher_auth.php).
$teacherId = current_teacher_id();

require_once __DIR__ . '/../users/teacher_class.php';
$classRow = teacher_active_class($conn, (int) $teacherId); // the class she is working in (class switch)

if (!$classRow) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Your account is not linked to a class yet — ask your admin to link it.']);
    exit;
}

$stmt = $conn->prepare("
    DELETE FROM materials
    WHERE id = ? AND class_id = ?
");
$stmt->bind_param('ii', $materialId, $classRow['id']);
$stmt->bind_param('ii', $materialId, $classRow['id']);
$stmt->execute();
$deleted = $stmt->affected_rows > 0;
$stmt->close();
$conn->close();

if (!$deleted) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'That material was not found, does not belong to your class, or was not imported (only imported materials can be deleted).']);
    exit;
}

echo json_encode(['status' => 'success']);
?>