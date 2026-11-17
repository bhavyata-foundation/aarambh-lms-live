<?php
// =========================================================================
// GET WORKBOOK COMPETENCY ASSESSMENT
//
// Returns every real per-pupil mark (level_mark: E/P/A) recorded
// against a workbook competency. This is the per-child grading table
// (a real row per pupil per competency), separate from
// workbook_competency_tally, which is the class-wide count table.
//
// Matches teacher.js's ensureWorkbookCompetencyMarksLoaded(), which
// calls this with no query params and builds its own byPupil lookup
// client-side — so this simply returns every mark and lets the
// client filter to whichever pupils are on its own real roster.
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
// DATABASE
// -------------------------------------------------------------------------

require_once __DIR__ . '/../../users/db_config.php';

$conn = get_db_connection();

// -------------------------------------------------------------------------
// GET MARKS
// -------------------------------------------------------------------------

$stmt = $conn->prepare(
    'SELECT
        pupil_id,
        workbook_competency_id,
        level_mark
     FROM workbook_competency_assessment'
);

$stmt->execute();

$r = $stmt->get_result();

$marks = [];

while ($row = $r->fetch_assoc()) {

    $marks[] = [

        'pupil_id' =>
            (int)$row['pupil_id'],

        'workbook_competency_id' =>
            (int)$row['workbook_competency_id'],

        'level_mark' =>
            $row['level_mark'],
    ];
}

$stmt->close();

// -------------------------------------------------------------------------
// CLOSE DATABASE
// -------------------------------------------------------------------------

$conn->close();

// -------------------------------------------------------------------------
// RESPONSE
// -------------------------------------------------------------------------

echo json_encode([
    'status' => 'success',
    'marks' => $marks
]);
