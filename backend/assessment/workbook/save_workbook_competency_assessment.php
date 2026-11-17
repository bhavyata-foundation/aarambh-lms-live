<?php
// =========================================================================
// SAVE WORKBOOK COMPETENCY ASSESSMENT
//
// Saves one real per-pupil mark (level_mark: E/P/A, or null to clear)
// against one workbook competency. Uses UPSERT on the unique key
// (pupil_id, workbook_competency_id) so grading the same pupil/
// competency again replaces the previous mark instead of creating a
// duplicate row — level_mark = null deletes the row entirely, since
// "not observed" and "graded blank" should not be the same as a row
// existing with an empty value.
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
// READ INPUT
// -------------------------------------------------------------------------

$input = json_decode(
    file_get_contents('php://input'),
    true
) ?? [];

$pupilId = isset($input['pupil_id'])
    ? (int)$input['pupil_id']
    : null;

$competencyId = isset($input['workbook_competency_id'])
    ? (int)$input['workbook_competency_id']
    : null;

$levelMark = $input['level_mark'] ?? null;

// -------------------------------------------------------------------------
// VALIDATION
// -------------------------------------------------------------------------

if (!$pupilId || !$competencyId) {
    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' =>
            'pupil_id and workbook_competency_id are both required.'
    ]);

    exit;
}

if (
    $levelMark !== null &&
    !in_array($levelMark, ['E', 'P', 'A'], true)
) {
    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' => 'level_mark must be E, P, A, or null.'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// DATABASE
// -------------------------------------------------------------------------

require_once __DIR__ . '/../../users/db_config.php';

$conn = get_db_connection();

// -------------------------------------------------------------------------
// VERIFY COMPETENCY EXISTS
// -------------------------------------------------------------------------

$stmt = $conn->prepare(
    'SELECT 1
     FROM workbook_competencies
     WHERE id = ?'
);

$stmt->bind_param(
    'i',
    $competencyId
);

$stmt->execute();

$exists =
    $stmt->get_result()->num_rows > 0;

$stmt->close();

if (!$exists) {
    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' => 'That competency does not exist.'
    ]);

    $conn->close();

    exit;
}

// -------------------------------------------------------------------------
// SAVE / CLEAR MARK
// -------------------------------------------------------------------------

if ($levelMark === null) {

    // Clearing a mark deletes the row entirely — "not observed" should
    // never be stored as a row with an empty value.
    $stmt = $conn->prepare(
        'DELETE FROM workbook_competency_assessment
         WHERE pupil_id = ? AND workbook_competency_id = ?'
    );

    $stmt->bind_param(
        'ii',
        $pupilId,
        $competencyId
    );

    $stmt->execute();
    $stmt->close();

} else {

    $stmt = $conn->prepare(
        'INSERT INTO workbook_competency_assessment
            (
                pupil_id,
                workbook_competency_id,
                level_mark
            )
         VALUES
            (?, ?, ?)

         ON DUPLICATE KEY UPDATE
            level_mark = VALUES(level_mark),
            date_updated = CURRENT_TIMESTAMP'
    );

    $stmt->bind_param(
        'iis',
        $pupilId,
        $competencyId,
        $levelMark
    );

    $stmt->execute();
    $stmt->close();
}

// -------------------------------------------------------------------------
// CLOSE DATABASE
// -------------------------------------------------------------------------

$conn->close();

// -------------------------------------------------------------------------
// RESPONSE
// -------------------------------------------------------------------------

echo json_encode([
    'status' => 'success'
]);
