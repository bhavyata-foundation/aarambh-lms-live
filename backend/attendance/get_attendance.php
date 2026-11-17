<?php
// =========================================================================
// GET ATTENDANCE
//
// Returns every real attendance mark for the selected class and month.
//
// Response format:
// {
//     "YYYY-MM-DD": {
//         "pupil_id": "present" | "absent"
//     }
// }
//
// Attendance is keyed by pupil_id so two pupils with the same name
// never get merged accidentally.
//
// The frontend can combine these records with its real pupil list.
// =========================================================================

session_start();
header('Content-Type: application/json');

// -------------------------------------------------------------------------
// AUTHENTICATION
// -------------------------------------------------------------------------

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');

$isLocalRequest = in_array(
    $requestHost,
    ['localhost', '127.0.0.1']
);

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
        'status' => 'error',
        'message' => 'Not authorized.'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// INPUT
// -------------------------------------------------------------------------

$classId = filter_var(
    $_GET['class_id'] ?? null,
    FILTER_VALIDATE_INT
);

$year = filter_var(
    $_GET['year'] ?? null,
    FILTER_VALIDATE_INT
);

$month = filter_var(
    $_GET['month'] ?? null,
    FILTER_VALIDATE_INT
); // 0-11, JavaScript month convention

// -------------------------------------------------------------------------
// VALIDATION
// -------------------------------------------------------------------------

if (
    $classId === false ||
    $classId === null ||
    $year === false ||
    $year === null ||
    $month === false ||
    $month === null ||
    $month < 0 ||
    $month > 11
) {
    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' => 'Missing or invalid fields.'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// DATABASE
// -------------------------------------------------------------------------

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../pupils/pupil_helpers.php';

$conn = get_db_connection();
$authorizedClass = pupil_authorized_class($conn, $classId);
$classId = $authorizedClass['id'];

// -------------------------------------------------------------------------
// GET ATTENDANCE FOR SELECTED MONTH
// -------------------------------------------------------------------------

$monthNum = $month + 1; // MySQL months are 1-12

$stmt = $conn->prepare(
    "SELECT
        a.pupil_id,
        a.date,
        a.status

     FROM daily_attendance a

     JOIN pupils p
       ON p.id = a.pupil_id

     WHERE p.class_id = ?
       AND YEAR(a.date) = ?
       AND MONTH(a.date) = ?"
);

$stmt->bind_param(
    'iii',
    $classId,
    $year,
    $monthNum
);

$stmt->execute();

$result = $stmt->get_result();

// -------------------------------------------------------------------------
// ORGANIZE BY DATE → PUPIL ID
// -------------------------------------------------------------------------

$byDate = [];

while ($row = $result->fetch_assoc()) {

    $date = $row['date'];
    $pupilId = $row['pupil_id'];

    if (!isset($byDate[$date])) {
        $byDate[$date] = [];
    }

    // Key by pupil_id rather than name.
    // This prevents pupils with identical names from being merged.
    $byDate[$date][$pupilId] = $row['status'];
}

// -------------------------------------------------------------------------
// CLOSE DATABASE
// -------------------------------------------------------------------------

$stmt->close();
$conn->close();

// -------------------------------------------------------------------------
// RESPONSE
// -------------------------------------------------------------------------

echo json_encode([
    'status' => 'success',
    'records' => $byDate
]);
