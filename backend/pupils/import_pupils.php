<?php
// =========================================================================
// IMPORT PUPILS — bulk version of add_pupil.php. Expects already-parsed
// rows in the request body (the frontend does the CSV/XLSX parsing with
// the same shared parser the Family Profile import already uses — no
// reason to duplicate that logic in PHP too).
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
$pupils   = $input['pupils'] ?? [];

if ($schoolId === false || $schoolId === null || $classId === false || $classId === null || !is_array($pupils)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid fields.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/pupil_helpers.php';
$conn = get_db_connection();
$class = pupil_authorized_class($conn, $classId);
$classId = $class['id'];
$schoolId = $class['school_id'];
$stmt = $conn->prepare('INSERT INTO pupils (school_id, class_id, name, admitted_date, active) VALUES (?, ?, ?, ?, 1)');

// Everyone already in this class (on the roll or taken off it), so the same
// list uploaded again — or with a spelling difference — adds nobody twice.
$records = [];
$ex = $conn->prepare('SELECT id, name, active FROM pupils WHERE class_id = ?');
$ex->bind_param('i', $classId); $ex->execute();
foreach ($ex->get_result()->fetch_all(MYSQLI_ASSOC) as $row) $records[(int) $row['id']] = $row;
$ex->close();
$byName = [];
foreach ($records as $id => $row) $byName[pupil_normalize_name($row['name'])] = $id;
$seenInFile = [];

$imported = 0;
$skipped = [];
$today = date('Y-m-d');

foreach ($pupils as $i => $p) {
    $rowNum = $i + 2; // +1 for 0-index, +1 for the header row the frontend already stripped
    $name = pupil_clean_name($p['name'] ?? '');
    $admittedDate = trim((string)($p['admitted_date'] ?? ''));

    if ($name === '') { $skipped[] = "Row {$rowNum}: name is required"; continue; }
    if ($admittedDate === '') { $admittedDate = $today; }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $admittedDate)) {
        $skipped[] = "Row {$rowNum} ({$name}): admitted_date must be YYYY-MM-DD, got \"{$admittedDate}\"";
        continue;
    }

    $key = pupil_normalize_name($name);
    if (isset($seenInFile[$key])) { $skipped[] = "Row {$rowNum} ({$name}): repeated in the file — added once."; continue; }
    $seenInFile[$key] = true;
    if (isset($byName[$key])) {
        $was = $records[$byName[$key]];
        $skipped[] = "Row {$rowNum} ({$name}): " . ($was['active'] ? 'already on the roll — not added again.' : 'already in this class but taken off the roll — bring her back in Admissions instead of adding her again.');
        continue;
    }
    $look = pupil_find_lookalike($records, $name);
    if ($look !== null) { $skipped[] = "Row {$rowNum} ({$name}): looks like \"{$records[$look]['name']}\", already in this class, spelled differently — not added. Correct the spelling in Admissions if needed."; continue; }

    $stmt->bind_param('iiss', $schoolId, $classId, $name, $admittedDate);
    if ($stmt->execute()) {
        $imported++;
        $newId = (int) $conn->insert_id;
        $records[$newId] = ['id' => $newId, 'name' => $name, 'active' => 1]; // a look-alike later in the same file is caught too
        $byName[$key] = $newId;
    }
    else { $skipped[] = "Row {$rowNum} ({$name}): database error"; }
}

$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'imported' => $imported, 'skipped' => $skipped]);
