<?php
// =========================================================================
// SAVE WORKBOOK ASSESSMENT
//
// Saves one (pupil, workbook page) assessment mark per call.
//
// level_mark:
//   E = Emerging
//   P = Proficient
//   A = Advanced
//   null / empty = clear the assessment
//
// Uses UPSERT so re-grading the same page updates the existing record
// instead of creating a duplicate.
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

$pageId = isset($input['workbook_page_id'])
    ? (int)$input['workbook_page_id']
    : null;

$levelMark = $input['level_mark'] ?? null;

// Treat an empty string as "clear assessment"
if ($levelMark === '') {
    $levelMark = null;
}

// -------------------------------------------------------------------------
// VALIDATION
// -------------------------------------------------------------------------

if (!$pupilId || !$pageId) {

    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' =>
            'pupil_id and workbook_page_id are both required.'
    ]);

    exit;
}

if (
    $levelMark !== null &&
    !in_array(
        $levelMark,
        ['E', 'P', 'A'],
        true
    )
) {

    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' =>
            'level_mark must be E, P, A, or null.'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// DATABASE
// -------------------------------------------------------------------------

require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../users/teacher_auth.php';

$conn = get_db_connection();

// -------------------------------------------------------------------------
// TEACHER ID
// -------------------------------------------------------------------------

// Logged-in teacher only — never a guessed teacher (see users/teacher_auth.php).
$teacherId = current_teacher_id();

// -------------------------------------------------------------------------
// VERIFY PUPIL OWNERSHIP
//
// A teacher can only assess pupils belonging to one of their classes.
// -------------------------------------------------------------------------

$stmt = $conn->prepare(
    'SELECT 1
     FROM pupils p
     JOIN classes c
       ON c.id = p.class_id
     WHERE p.id = ?
       AND c.teacher_user_id = ?'
);

$stmt->bind_param(
    'ii',
    $pupilId,
    $teacherId
);

$stmt->execute();

$owns =
    $stmt->get_result()->num_rows > 0;

$stmt->close();

if (!$owns) {

    http_response_code(403);

    echo json_encode([
        'status' => 'error',
        'message' =>
            'That pupil is not in your class.'
    ]);

    $conn->close();

    exit;
}

// -------------------------------------------------------------------------
// CLEAR ASSESSMENT
// -------------------------------------------------------------------------

if ($levelMark === null) {

    $stmt = $conn->prepare(
        'DELETE FROM workbook_assessment
         WHERE pupil_id = ?
           AND workbook_page_id = ?'
    );

    $stmt->bind_param(
        'ii',
        $pupilId,
        $pageId
    );

    $stmt->execute();

    $stmt->close();

// -------------------------------------------------------------------------
// SAVE / UPDATE ASSESSMENT
// -------------------------------------------------------------------------

} else {

    $stmt = $conn->prepare(
        'INSERT INTO workbook_assessment
            (
                pupil_id,
                workbook_page_id,
                level_mark,
                teacher_user_id
            )
         VALUES
            (?, ?, ?, ?)

         ON DUPLICATE KEY UPDATE
            level_mark = VALUES(level_mark),
            teacher_user_id = VALUES(teacher_user_id),
            date_marked = CURRENT_TIMESTAMP'
    );

    $stmt->bind_param(
        'iisi',
        $pupilId,
        $pageId,
        $levelMark,
        $teacherId
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