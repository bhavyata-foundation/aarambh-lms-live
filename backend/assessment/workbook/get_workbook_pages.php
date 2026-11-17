<?php
// =========================================================================
// GET WORKBOOK PAGES
//
// Returns the master page/CG-code list for a given class level and month.
//
// Example:
//   level = Jr KG
//   month = July
//
// Returns each workbook available for that level, along with the pages
// scheduled for that month.
//
// This is content, not per-pupil data. Every teacher at the same level
// sees the same workbook/page list.
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

$level = $_GET['level'] ?? null;
$month = $_GET['month'] ?? null;

if (!$level || !$month) {
    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' => 'level and month are both required.'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// DATABASE
// -------------------------------------------------------------------------

require_once __DIR__ . '/../../users/db_config.php';

$conn = get_db_connection();

// -------------------------------------------------------------------------
// GET WORKBOOKS FOR THIS LEVEL
//
// Every workbook at the level is returned, even if it has no pages
// scheduled for the selected month.
// -------------------------------------------------------------------------

$stmt = $conn->prepare(
    'SELECT
        id,
        name
     FROM workbooks
     WHERE level = ?
     ORDER BY display_order ASC'
);

$stmt->bind_param(
    's',
    $level
);

$stmt->execute();

$workbookResult = $stmt->get_result();

$workbooks = [];
$workbookIds = [];

while ($row = $workbookResult->fetch_assoc()) {

    $workbookId = (int)$row['id'];

    $row['pages'] = [];

    $workbooks[$workbookId] = $row;

    $workbookIds[] = $workbookId;
}

$stmt->close();

// -------------------------------------------------------------------------
// GET PAGES SCHEDULED FOR THIS MONTH
// -------------------------------------------------------------------------

if ($workbookIds) {

    $placeholders = implode(
        ',',
        array_fill(
            0,
            count($workbookIds),
            '?'
        )
    );

    $types =
        str_repeat('i', count($workbookIds)) . 's';

    $params =
        array_merge(
            $workbookIds,
            [$month]
        );

    $sql = "
        SELECT
            id,
            workbook_id,
            page_number,
            activity_no,
            cg_code,
            activity_title

        FROM workbook_pages

        WHERE workbook_id IN ($placeholders)
          AND month_scheduled = ?

        ORDER BY page_number ASC, activity_no ASC
    ";

    $stmt = $conn->prepare($sql);

    $stmt->bind_param(
        $types,
        ...$params
    );

    $stmt->execute();

    $pageResult = $stmt->get_result();

    while ($row = $pageResult->fetch_assoc()) {

        $workbookId =
            (int)$row['workbook_id'];

        $workbooks[$workbookId]['pages'][] = [

            'id' =>
                (int)$row['id'],

            'page_number' =>
                $row['page_number'],

            'activity_no' =>
                (int)$row['activity_no'],

            'cg_code' =>
                $row['cg_code'],

            'activity_title' =>
                $row['activity_title'],
        ];
    }

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
    'status' => 'success',
    'workbooks' => array_values($workbooks)
]);