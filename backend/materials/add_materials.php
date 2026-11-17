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
// ADD MATERIAL — a teacher logs an item that's actually arrived. Adding
// the row IS the received-status record; there's no separate step.
//
// FIXED: this previously ignored category, supply source (the "BMC /
// Bhavyata Foundation / Other Foundation" dropdown — a real, different
// thing from the `source` column below, which tracks manual-vs-import
// entry, not supply origin), and item_condition, even though the
// frontend form already collected all three. Now actually stored.
//
// NEW: drive_file_id / drive_link — set when a Workbook-category item
// has a file attached via upload_to_drive.php on the frontend before
// this call. Optional; most items (Stationery, TLM, etc.) won't have one.
//
// `source` (manual vs import) unchanged: every row inserted here is
// tagged source = 'manual', distinct from import_materials.php's rows
// (source = 'import') — this is what lets the frontend only offer a
// delete toggle on CSV/XLSX-imported rows, not manually-entered ones.
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
$itemName = trim($input['item_name'] ?? '');
$quantity = trim($input['quantity'] ?? '');
$receivedDate = $input['received_date'] ?? '';
$category = trim($input['category'] ?? 'Other');
// The frontend's dropdown field is named "source" (supply origin —
// BMC / Bhavyata Foundation / Other Foundation), which collides with
// this table's own `source` column (manual vs import entry tracking).
// Read it as $input['source'] here, but store it as supply_source.
$supplySource = trim($input['source'] ?? 'BMC');
$itemCondition = trim($input['item_condition'] ?? 'usable');
$driveFileId = trim($input['drive_file_id'] ?? '');
$driveLink = trim($input['drive_link'] ?? '');

if ($itemName === '' || $receivedDate === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Item name and received date are both required.']);
    exit;
}
$validCategories = ['TLM', 'Stationery', 'Workbook', 'Other'];
if (!in_array($category, $validCategories, true)) $category = 'Other';
// BMC, Bhavyata Foundation, Other Foundation, or the name of another foundation typed on the receipt form (up to 100 characters).
$supplySource = mb_substr($supplySource, 0, 100);
if ($supplySource === '') $supplySource = 'BMC';

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

// The logged-in teacher only — never a guessed teacher (users/teacher_auth.php).
require_once __DIR__ . '/../users/teacher_auth.php';
$teacherId = current_teacher_id();

require_once __DIR__ . '/../users/teacher_class.php';
$classRow = teacher_active_class($conn, (int) $teacherId); // the class she is working in (class switch)

if (!$classRow) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Your account is not linked to a class yet — ask your admin to link it.']);
    exit;
}

// Params in order: class_id(i), item_name(s), category(s), supply_source(s),
// quantity(s), received_date(s), added_by(i), item_condition(s),
// drive_file_id(s), drive_link(s) — 10 params, type string "isssssisss".
$stmt = $conn->prepare("
    INSERT INTO materials (class_id, item_name, category, supply_source, quantity, received_date, added_by, source, item_condition, drive_file_id, drive_link)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'manual', ?, ?, ?)
");
$stmt->bind_param(
    'isssssisss',
    $classRow['id'], $itemName, $category, $supplySource, $quantity, $receivedDate, $teacherId, $itemCondition, $driveFileId, $driveLink
);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'material_id' => $conn->insert_id]);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $stmt->error]);
}

$stmt->close();
$conn->close();
?>