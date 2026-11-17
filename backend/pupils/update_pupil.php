<?php
// =========================================================================
// UPDATE PUPIL — edits an existing pupil's admission details. Same
// fields add_pupil.php accepts, but targets an existing row by id
// instead of inserting a new one. Used to fill in DOB/gender/address/
// etc. for pupils that were bulk-imported (name + admitted_date only)
// rather than added through the full admission form.
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
$name = trim((string)($input['name'] ?? ''));
$admittedDate = $input['admitted_date'] ?? null;

if ($pupilId === false || $pupilId === null || $name === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid fields — pupil_id and name are required.']);
    exit;
}
if ($admittedDate !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $admittedDate)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'admitted_date must be in YYYY-MM-DD format.']);
    exit;
}

$address = trim((string)($input['address'] ?? '')) ?: null;
$dob = trim((string)($input['dob'] ?? '')) ?: null;
$gender = trim((string)($input['gender'] ?? '')) ?: null;
$speciallyAbled = !empty($input['specially_abled']) ? 1 : 0;
$prevStudied = !empty($input['prev_studied']) ? 1 : 0;
$prevSchool = trim((string)($input['prev_school'] ?? '')) ?: null;
$prevStandard = trim((string)($input['prev_standard'] ?? '')) ?: null;
$prevBoard = trim((string)($input['prev_board'] ?? '')) ?: null;
$prevReason = trim((string)($input['prev_reason'] ?? '')) ?: null;
$receiptDriveLink = trim((string)($input['receipt_drive_link'] ?? '')) ?: null;
$receiptDriveFileId = trim((string)($input['receipt_drive_file_id'] ?? '')) ?: null;

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/pupil_helpers.php';
$conn = get_db_connection();
$class = pupil_authorized_class($conn, $input['class_id'] ?? null);
$name = pupil_clean_name($name);

$stmt = $conn->prepare(
    'UPDATE pupils SET
        name = ?, admitted_date = COALESCE(?, admitted_date),
        address = ?, dob = ?, gender = ?, specially_abled = ?,
        prev_studied = ?, prev_school = ?, prev_standard = ?, prev_board = ?, prev_reason = ?,
        receipt_drive_link = COALESCE(?, receipt_drive_link), receipt_drive_file_id = COALESCE(?, receipt_drive_file_id)
     WHERE id = ? AND class_id = ?'
);
$stmt->bind_param(
    'sssssiissssssii',
    $name, $admittedDate, $address, $dob, $gender, $speciallyAbled,
    $prevStudied, $prevSchool, $prevStandard, $prevBoard, $prevReason,
    $receiptDriveLink, $receiptDriveFileId, $pupilId, $class['id']
);
$ok = $stmt->execute();
$stmt->close();
$conn->close();

if (!$ok) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not save changes.']);
    exit;
}

echo json_encode(['status' => 'success']);
