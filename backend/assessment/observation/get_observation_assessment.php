<?php
// =========================================================================
// GET OBSERVATION ASSESSMENT
// Returns every real (pupil, item) mark that this teacher's pupils have
// for a given month.
//
// FILE LOCATION:
// backend/assessment/observation/get_observation_assessment.php
// =========================================================================

session_start();

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

// -------------------------------------------------------------------------
// AUTHENTICATION
// -------------------------------------------------------------------------

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');

$isLocalRequest = in_array(
    $requestHost,
    ['localhost', '127.0.0.1'],
    true
);

// Allow dev_role only when running locally
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
// Current location:
// backend/users/db_config.php
//
// Current file:
// backend/assessment/observation/get_observation_assessment.php
// -------------------------------------------------------------------------

require_once __DIR__ . '/../../users/db_config.php';

$conn = get_db_connection();

// -------------------------------------------------------------------------
// GET TEACHER ID
// -------------------------------------------------------------------------

// The logged-in teacher only (users/teacher_auth.php). Never a guessed
// teacher: anyone not logged in is refused with "Please log in again."
require_once __DIR__ . '/../../users/teacher_auth.php';
$teacherId = current_teacher_id();

// -------------------------------------------------------------------------
// GET ALL CLASSES BELONGING TO THIS TEACHER
// -------------------------------------------------------------------------

$stmt = $conn->prepare(
    'SELECT id
     FROM classes
     WHERE teacher_user_id = ?'
);

$stmt->bind_param('i', $teacherId);
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
// BUILD PLACEHOLDERS FOR CLASS IDs
//
// Example:
// 3 classes => ?,?,?
// -------------------------------------------------------------------------

$classPlaceholders = implode(
    ',',
    array_fill(0, count($classIds), '?')
);

$types = str_repeat('i', count($classIds)) . 's';

$params = array_merge(
    $classIds,
    [$month]
);

// -------------------------------------------------------------------------
// GET OBSERVATION ASSESSMENT MARKS
// -------------------------------------------------------------------------

$sql = "
    SELECT
        oa.pupil_id,
        oa.observation_item_id,
        oa.level_mark

    FROM observation_assessment oa

    JOIN pupils p
        ON p.id = oa.pupil_id

    JOIN observation_items oi
        ON oi.id = oa.observation_item_id

    JOIN observation_themes ot
        ON ot.id = oi.theme_id

    WHERE
        p.class_id IN ($classPlaceholders)
        AND ot.month_scheduled = ?
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
        'pupil_id'            => (int) $row['pupil_id'],
        'observation_item_id' => (int) $row['observation_item_id'],
        'level_mark'          => $row['level_mark']
    ];
}

// -------------------------------------------------------------------------
// CLOSE CONNECTIONS
// -------------------------------------------------------------------------

$stmt->close();
$conn->close();

// -------------------------------------------------------------------------
// RETURN JSON
// -------------------------------------------------------------------------

echo json_encode([
    'status' => 'success',
    'marks'  => $marks
]);