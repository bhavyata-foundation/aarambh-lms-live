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
// GET MATERIALS — returns every material logged for the teacher's own
// class. This is the actual SELECT counterpart to add_materials.php.
//
// UPDATED: now also selects category, supply_source, item_condition,
// drive_file_id, and drive_link — all five existed as real columns
// already (added alongside the photo-upload feature), but this
// endpoint's explicit column list never included them, so the frontend
// could save a photo successfully and still never be able to show it
// was there. Previously only `source` ('manual'/'import') was added.
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

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../users/teacher_auth.php';
$conn = get_db_connection();

// Same teacher-to-class resolution used everywhere else in this
// project — including the same fix applied to get_my_class.php and
// import_materials.php: the dev-bypass fallback is hardcoded to
// teacher 49, the one real teacher-to-class link that actually exists
// right now, rather than an unlinked "any teacher" lookup.
// Logged-in teacher only — never a guessed teacher (see users/teacher_auth.php).
$teacherId = current_teacher_id();

require_once __DIR__ . '/../users/teacher_class.php';
$classRow = teacher_active_class($conn, (int) $teacherId); // the class she is working in (class switch)

if (!$classRow) {
    echo json_encode(['status' => 'success', 'materials' => []]);
    $conn->close();
    exit;
}

$stmt = $conn->prepare("
    SELECT id, item_name, category, supply_source, quantity, received_date, distributed, source, item_condition, drive_file_id, drive_link
    FROM materials
    WHERE class_id = ?
    ORDER BY received_date DESC, id DESC
");
$stmt->bind_param('i', $classRow['id']);
$stmt->execute();
$result = $stmt->get_result();

$materials = [];
while ($row = $result->fetch_assoc()) {
    $row['distributed'] = (bool) $row['distributed'];
    // Older rows inserted before the `source` column existed will read
    // as NULL — treat those as 'manual' so nothing pre-existing
    // suddenly grows a delete button it never had.
    $row['source'] = $row['source'] ?? 'manual';
    // Older rows inserted before category/supply_source/item_condition
    // existed will read as NULL — default them honestly rather than
    // leaving the frontend to guess at missing data differently in
    // different places.
    $row['category'] = $row['category'] ?? 'Other';
    $row['supply_source'] = $row['supply_source'] ?? 'BMC';
    $row['item_condition'] = $row['item_condition'] ?? 'usable';
    // drive_file_id / drive_link stay NULL when absent — the frontend
    // already treats a missing drive_link as "no photo yet", so there's
    // no honest default to substitute here the way there is above.
    $materials[] = $row;
}

$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'materials' => $materials]);
?>