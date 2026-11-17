<?php
// =========================================================================
// ADD WORKBOOK COMPETENCY
//
// Lets a teacher define a new competency row for a workbook directly
// from the app.
//
// Validates:
// - Workbook exists
// - Curricular Goal exists
// - C-Code format is valid
// - Page numbers format is valid
// - Duplicate C-Code is prevented
//
// FILE LOCATION:
// backend/assessment/workbook/add_workbook_competency.php
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
// READ REQUEST BODY
// -------------------------------------------------------------------------

$input = json_decode(
    file_get_contents('php://input'),
    true
) ?? [];

// -------------------------------------------------------------------------
// GET INPUT VALUES
// -------------------------------------------------------------------------

$workbookId = isset($input['workbook_id'])
    ? (int) $input['workbook_id']
    : null;

$curricularGoalId = isset($input['curricular_goal_id'])
    ? (int) $input['curricular_goal_id']
    : null;

$cgCode = trim(
    $input['cg_code'] ?? ''
);

$competencyText = trim(
    $input['competency_text'] ?? ''
);

$pageNumbers = trim(
    $input['page_numbers'] ?? ''
);

// -------------------------------------------------------------------------
// REQUIRED FIELD VALIDATION
// -------------------------------------------------------------------------

if (
    !$workbookId ||
    !$curricularGoalId ||
    $cgCode === '' ||
    $competencyText === ''
) {

    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Workbook, Curricular Goal, C-Code, and Competency text are all required.'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// VALIDATE C-CODE
//
// Expected examples:
// C-8
// C-8.3
// C-10
// C-10.8
// -------------------------------------------------------------------------

if (!preg_match('/^C-\d+(\.\d+)?$/', $cgCode)) {

    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'C-Code should look like "C-8.3" (a C, a dash, then the CG number and sub-number).'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// VALIDATE PAGE NUMBERS
//
// Examples accepted:
// 6
// 6, 9
// 6, 9, 19, 20
//
// Blank is also allowed.
// -------------------------------------------------------------------------

if (
    $pageNumbers !== '' &&
    !preg_match(
        '/^\d+(\s*,\s*\d+)*$/',
        $pageNumbers
    )
) {

    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Page numbers should be a comma-separated list like "6, 9, 19, 20", or left blank.'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// DATABASE CONNECTION
//
// Current file:
// backend/assessment/workbook/add_workbook_competency.php
//
// Database config:
// backend/users/db_config.php
// -------------------------------------------------------------------------

require_once __DIR__ . '/../../users/db_config.php';

$conn = get_db_connection();

// -------------------------------------------------------------------------
// CHECK THAT WORKBOOK EXISTS
// -------------------------------------------------------------------------

$stmt = $conn->prepare(
    'SELECT 1
     FROM workbooks
     WHERE id = ?'
);

$stmt->bind_param(
    'i',
    $workbookId
);

$stmt->execute();

$workbookExists =
    $stmt->get_result()->num_rows > 0;

$stmt->close();

if (!$workbookExists) {

    $conn->close();

    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'That workbook does not exist.'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// CHECK THAT CURRICULAR GOAL EXISTS
// -------------------------------------------------------------------------

$stmt = $conn->prepare(
    'SELECT 1
     FROM curricular_goals
     WHERE id = ?'
);

$stmt->bind_param(
    'i',
    $curricularGoalId
);

$stmt->execute();

$cgExists =
    $stmt->get_result()->num_rows > 0;

$stmt->close();

if (!$cgExists) {

    $conn->close();

    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'That Curricular Goal does not exist.'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// GET NEXT DISPLAY ORDER
//
// New competency rows are added to the end of this workbook's list.
// -------------------------------------------------------------------------

$stmt = $conn->prepare(
    'SELECT
        COALESCE(MAX(display_order), 0) AS max_order
     FROM workbook_competencies
     WHERE workbook_id = ?'
);

$stmt->bind_param(
    'i',
    $workbookId
);

$stmt->execute();

$orderRow = $stmt->get_result()->fetch_assoc();

$nextOrder =
    (int) $orderRow['max_order'] + 1;

$stmt->close();

// -------------------------------------------------------------------------
// INSERT NEW WORKBOOK COMPETENCY
// -------------------------------------------------------------------------

$stmt = $conn->prepare(
    'INSERT INTO workbook_competencies
        (
            workbook_id,
            curricular_goal_id,
            cg_code,
            competency_text,
            page_numbers,
            display_order
        )
     VALUES
        (?, ?, ?, ?, ?, ?)'
);

$stmt->bind_param(
    'iisssi',
    $workbookId,
    $curricularGoalId,
    $cgCode,
    $competencyText,
    $pageNumbers,
    $nextOrder
);

$success = $stmt->execute();

// -------------------------------------------------------------------------
// HANDLE INSERT ERROR
// -------------------------------------------------------------------------

if (!$success) {

    $err = $stmt->error;

    $stmt->close();
    $conn->close();

    http_response_code(400);

    // Duplicate C-Code within the same workbook
    if (
        strpos(
            $err,
            'uq_workbook_cgcode'
        ) !== false
    ) {

        $message =
            'That C-Code already exists for this workbook.';

    } else {

        $message =
            'Could not save — ' . $err;
    }

    echo json_encode([
        'status'  => 'error',
        'message' => $message
    ]);

    exit;
}

// -------------------------------------------------------------------------
// GET NEW RECORD ID
// -------------------------------------------------------------------------

$newId = $conn->insert_id;

// -------------------------------------------------------------------------
// CLOSE CONNECTIONS
// -------------------------------------------------------------------------

$stmt->close();
$conn->close();

// -------------------------------------------------------------------------
// SUCCESS RESPONSE
// -------------------------------------------------------------------------

echo json_encode([
    'status' => 'success',
    'id'     => $newId
]);