<?php
// =========================================================================
// GET WORKBOOK COMPETENCIES
//
// Returns every workbook for a level, each with:
// - Its competency list grouped by curricular goal
// - Competency details matching the printed HPC record format
// - Optional month-specific scheduled page range from workbook_pages
//
// workbook_pages remains the source for determining which pages are
// scheduled for a particular month.
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
$month = $_GET['month'] ?? null; // Optional

if (!$level) {
    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' => 'level is required.'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// DATABASE
// -------------------------------------------------------------------------

require_once __DIR__ . '/../../users/db_config.php';

$conn = get_db_connection();

// -------------------------------------------------------------------------
// GET WORKBOOKS FOR LEVEL
// -------------------------------------------------------------------------

$stmt = $conn->prepare(
    'SELECT id, name
     FROM workbooks
     WHERE level = ?
     ORDER BY display_order ASC'
);

$stmt->bind_param('s', $level);
$stmt->execute();

$r = $stmt->get_result();

$workbooks = [];
$workbookIds = [];

while ($row = $r->fetch_assoc()) {

    $row['competencies'] = [];
    $row['page_range'] = null;

    $workbookId = (int)$row['id'];

    $workbooks[$workbookId] = $row;
    $workbookIds[] = $workbookId;
}

$stmt->close();

// -------------------------------------------------------------------------
// GET COMPETENCIES FOR ALL WORKBOOKS
// -------------------------------------------------------------------------

if ($workbookIds) {

    $placeholders = implode(
        ',',
        array_fill(0, count($workbookIds), '?')
    );

    $types = str_repeat(
        'i',
        count($workbookIds)
    );

    $sql = "
        SELECT
            wc.id,
            wc.workbook_id,
            wc.cg_code,
            wc.competency_text,
            wc.page_numbers,
            cg.id AS curricular_goal_id,
            cg.goal_text

        FROM workbook_competencies wc

        JOIN curricular_goals cg
            ON cg.id = wc.curricular_goal_id

        WHERE wc.workbook_id IN ($placeholders)

        ORDER BY
            wc.workbook_id,
            wc.display_order ASC
    ";

    $stmt = $conn->prepare($sql);

    $stmt->bind_param(
        $types,
        ...$workbookIds
    );

    $stmt->execute();

    $r = $stmt->get_result();

    while ($row = $r->fetch_assoc()) {

        $workbookId = (int)$row['workbook_id'];

        $workbooks[$workbookId]['competencies'][] = [

            'id' => (int)$row['id'],

            'cg_code' => $row['cg_code'],

            'competency_text' => $row['competency_text'],

            'page_numbers' => $row['page_numbers'],

            'curricular_goal_id' =>
                (int)$row['curricular_goal_id'],

            'goal_text' => $row['goal_text'],
        ];
    }

    $stmt->close();

    // ---------------------------------------------------------------------
    // GET MONTH-SPECIFIC PAGE RANGE
    // ---------------------------------------------------------------------

    if ($month) {

        $types2 =
            str_repeat('i', count($workbookIds)) . 's';

        $params2 =
            array_merge($workbookIds, [$month]);

        $sql2 = "
            SELECT
                workbook_id,
                MIN(page_number) AS min_page,
                MAX(page_number) AS max_page

            FROM workbook_pages

            WHERE workbook_id IN ($placeholders)
              AND month_scheduled = ?

            GROUP BY workbook_id
        ";

        $stmt = $conn->prepare($sql2);

        $stmt->bind_param(
            $types2,
            ...$params2
        );

        $stmt->execute();

        $r = $stmt->get_result();

        while ($row = $r->fetch_assoc()) {

            // Convert DECIMAL values such as 12.0 to clean numbers.
            $min = $row['min_page'] + 0;
            $max = $row['max_page'] + 0;

            $workbookId = (int)$row['workbook_id'];

            if ($min == $max) {

                $workbooks[$workbookId]['page_range'] =
                    "Page $min";

            } else {

                $workbooks[$workbookId]['page_range'] =
                    "Pages " . $min . "-" . $max;
            }
        }

        $stmt->close();
    }
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