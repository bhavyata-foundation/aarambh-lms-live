<?php
// =========================================================================
// ADD PUPIL — manual, one-at-a-time addition to the real pupils table.
// For a single new admission mid-year — bulk rosters go through
// import_pupils.php instead.
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

$schoolId = filter_var($input['school_id'] ?? null, FILTER_VALIDATE_INT);
$classId  = filter_var($input['class_id'] ?? null, FILTER_VALIDATE_INT);
$name     = trim((string)($input['name'] ?? ''));
$admittedDate = $input['admitted_date'] ?? date('Y-m-d');

// Optional admission-detail fields — all nullable, since a quick
// spreadsheet-imported pupil (name + admitted_date only) is just as
// valid as one added through the full admission form.
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

if ($schoolId === false || $schoolId === null || $classId === false || $classId === null || $name === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid fields — name, school_id and class_id are required.']);
    exit;
}

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $admittedDate)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'admitted_date must be in YYYY-MM-DD format.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/pupil_helpers.php';
$conn = get_db_connection();
$class = pupil_authorized_class($conn, $classId);
$classId = $class['id'];
$schoolId = $class['school_id'];
$name = pupil_clean_name($name);

// A pupil previously taken off the roll must be restored, not inserted as a
// second person, otherwise her attendance and assessments split across IDs.
$existingId = null;
$existingActive = 0;
$existing = $conn->prepare('SELECT id, name, active FROM pupils WHERE class_id = ?');
$existing->bind_param('i', $classId);
$existing->execute();
$result = $existing->get_result();
while ($row = $result->fetch_assoc()) {
    if (pupil_normalize_name($row['name']) === pupil_normalize_name($name)) {
        if ($existingId !== null) {
            $existing->close();
            $conn->close();
            pupil_json_error(409, 'More than one pupil has this name. Use the roster import with register numbers.');
        }
        $existingId = (int) $row['id'];
        $existingActive = (int) $row['active'];
    }
}
$existing->close();

if ($existingId !== null && $existingActive) {
    $conn->close();
    pupil_json_error(409, 'A pupil with this name is already on the class roll.');
}

if ($existingId !== null) {
    $stmt = $conn->prepare(
        'UPDATE pupils SET active = 1, name = ?, admitted_date = ?, address = ?, dob = ?, gender = ?, specially_abled = ?, '
        . 'prev_studied = ?, prev_school = ?, prev_standard = ?, prev_board = ?, prev_reason = ?, '
        . 'receipt_drive_link = ?, receipt_drive_file_id = ? WHERE id = ? AND class_id = ?'
    );
    $stmt->bind_param(
        'sssssiissssssii',
        $name, $admittedDate, $address, $dob, $gender, $speciallyAbled,
        $prevStudied, $prevSchool, $prevStandard, $prevBoard, $prevReason,
        $receiptDriveLink, $receiptDriveFileId, $existingId, $classId
    );
    $stmt->execute();
    $stmt->close();
    $conn->close();
    echo json_encode(['status' => 'success', 'pupil_id' => $existingId, 'reactivated' => true]);
    exit;
}

$stmt = $conn->prepare(
    'INSERT INTO pupils
        (school_id, class_id, name, admitted_date, active, address, dob, gender, specially_abled, prev_studied, prev_school, prev_standard, prev_board, prev_reason, receipt_drive_link, receipt_drive_file_id)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->bind_param(
    'iisssssiissssss',
    $schoolId, $classId, $name, $admittedDate,
    $address, $dob, $gender, $speciallyAbled, $prevStudied, $prevSchool, $prevStandard, $prevBoard, $prevReason,
    $receiptDriveLink, $receiptDriveFileId
);
$ok = $stmt->execute();
$newId = $stmt->insert_id;
$stmt->close();
$conn->close();

if (!$ok) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not save this pupil.']);
    exit;
}

echo json_encode(['status' => 'success', 'pupil_id' => $newId]);
