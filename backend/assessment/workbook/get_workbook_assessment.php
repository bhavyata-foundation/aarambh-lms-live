<?php
// =========================================================================
// GET WORKBOOK ASSESSMENT
//
// Returns every real (pupil, page) mark that this teacher's pupils have
// for a given month.
//
// Scoped by month, not by level, because a teacher may have pupils across
// two levels (e.g. Jr KG + Sr KG) in one call.
//
// The frontend groups rows by each pupil's own class/level afterward,
// using the page list fetched from get_workbook_pages.php.
//
// FILE LOCATION:
// backend/assessment/workbook/get_workbook_assessment.php
// =========================================================================

session_start();

header('Content-Type: application/json');

// -------------------------------------------------------------------------
// AUTHENTICATION
// -------------------------------------------------------------------------

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');

$isLocalRequest = in_array(
    $requestHost,
    ['localhost', '127.0.0.1'],
    true
);

// Allow dev_role only during local development
$devRole = (
    $isLocalRequest &&
    isset($_GET['dev_role'])
)
    ? $_GET['dev_role']
    : null;

$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'teacher') {
    http_response_code(401);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Not authorized.'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// MONTH VALIDATION
// -------------------------------------------------------------------------

$month = $_GET['month'] ?? null;

if (!$month) {
    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'month is required.'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// DATABASE CONNECTION
//
// Current file:
// backend/assessment/workbook/get_workbook_assessment.php
//
// Database config:
// backend/users/db_config.php
// -------------------------------------------------------------------------

require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../users/teacher_auth.php';

$conn = get_db_connection();

// -------------------------------------------------------------------------
// GET TEACHER ID
// -------------------------------------------------------------------------

// Logged-in teacher only — never a guessed teacher (see users/teacher_auth.php).
$teacherId = current_teacher_id();

// -------------------------------------------------------------------------
// GET ALL CLASSES BELONGING TO THIS TEACHER
// -------------------------------------------------------------------------

$stmt = $conn->prepare(
    'SELECT id
     FROM classes
     WHERE teacher_user_id = ?'
);

$stmt->bind_param(
    'i',
    $teacherId
);

$stmt->execute();

$classResult = $stmt->get_result();

$classIds = [];

while ($row = $classResult->fetch_assoc()) {
    $classIds[] = (int) $row['id'];
}

$stmt->close();

// -------------------------------------------------------------------------
// NO CLASSES = NO MARKS
// -------------------------------------------------------------------------

if (!$classIds) {

    $conn->close();

    echo json_encode([
        'status' => 'success',
        'marks'  => []
    ]);

    exit;
}

// -------------------------------------------------------------------------
// BUILD CLASS PLACEHOLDERS
//
// Example:
// 3 classes => ?,?,?
// -------------------------------------------------------------------------

$classPlaceholders = implode(
    ',',
    array_fill(0, count($classIds), '?')
);

$types = str_repeat(
    'i',
    count($classIds)
) . 's';

$params = array_merge(
    $classIds,
    [$month]
);

// -------------------------------------------------------------------------
// GET WORKBOOK ASSESSMENT MARKS
//
// Only returns pages scheduled for the requested month.
// -------------------------------------------------------------------------

$sql = "
    SELECT
        wa.pupil_id,
        wa.workbook_page_id,
        wa.level_mark

    FROM workbook_assessment wa

    JOIN pupils p
        ON p.id = wa.pupil_id

    JOIN workbook_pages wp
        ON wp.id = wa.workbook_page_id

    WHERE
        p.class_id IN ($classPlaceholders)
        AND wp.month_scheduled = ?
";

$stmt = $conn->prepare($sql);

$stmt->bind_param(
    $types,
    ...$params
);

$stmt->execute();

$result = $stmt->get_result();

// -------------------------------------------------------------------------
// BUILD RESPONSE
// -------------------------------------------------------------------------

$marks = [];

while ($row = $result->fetch_assoc()) {

    $marks[] = [
        'pupil_id'        => (int) $row['pupil_id'],
        'workbook_page_id' => (int) $row['workbook_page_id'],
        'level_mark'      => $row['level_mark']
    ];
}

// -------------------------------------------------------------------------
// CLOSE CONNECTIONS
// -------------------------------------------------------------------------

$stmt->close();
$conn->close();

// -------------------------------------------------------------------------
// RETURN JSON RESPONSE
// -------------------------------------------------------------------------

echo json_encode([
    'status' => 'success',
    'marks'  => $marks
]);