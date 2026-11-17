<?php
// =========================================================================
// GET OBSERVATION THEMES
//
// Returns the master observation theme/item list for a given
// class level and month.
//
// Example:
// level = Jr KG
// month = July
//
// Returns themes such as:
// - Emotions and Feelings
// - My Family
// - Fruits and Vegetables
// - Habits, Hygiene and Health
//
// Each theme contains its observation items and corresponding CG details.
//
// FILE LOCATION:
// backend/assessment/observation/get_observation_themes.php
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

// Allow dev_role only for local development
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
// GET REQUEST PARAMETERS
// -------------------------------------------------------------------------

$level = $_GET['level'] ?? null;
$month = $_GET['month'] ?? null;

if (!$level || !$month) {
    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'level and month are both required.'
    ]);

    exit;
}

// -------------------------------------------------------------------------
// DATABASE CONNECTION
//
// Current file:
// backend/assessment/observation/get_observation_themes.php
//
// Database config:
// backend/users/db_config.php
// -------------------------------------------------------------------------

require_once __DIR__ . '/../../users/db_config.php';

$conn = get_db_connection();

// -------------------------------------------------------------------------
// GET THEMES FOR LEVEL + MONTH
// -------------------------------------------------------------------------

// Retired themes / competencies (superadmin "Content & Activities") are left out.
// The column exists once backend/sql/008_content_editing.sql has been run.
$hasRetired = function($table) use ($conn) {
    $r = $conn->query("SHOW COLUMNS FROM `$table` LIKE 'retired'");
    return $r && $r->num_rows > 0;
};
$themeRetired = $hasRetired('observation_themes') ? ' AND retired = 0' : '';
$itemRetired = $hasRetired('observation_items') ? ' AND retired = 0' : '';
$stmt = $conn->prepare(
    'SELECT
        id,
        name
     FROM observation_themes
     WHERE level = ?
       AND month_scheduled = ?' . $themeRetired . '
     ORDER BY display_order ASC'
);

$stmt->bind_param(
    'ss',
    $level,
    $month
);

$stmt->execute();

$themeResult = $stmt->get_result();

$themes = [];
$themeIds = [];

// -------------------------------------------------------------------------
// BUILD THEME LIST
// -------------------------------------------------------------------------

while ($row = $themeResult->fetch_assoc()) {

    $row['items'] = [];

    $themeId = (int) $row['id'];

    $themes[$themeId] = $row;

    $themeIds[] = $themeId;
}

$stmt->close();

// -------------------------------------------------------------------------
// GET ITEMS FOR THESE THEMES
// -------------------------------------------------------------------------

if ($themeIds) {

    $placeholders = implode(
        ',',
        array_fill(0, count($themeIds), '?')
    );

    $types = str_repeat(
        'i',
        count($themeIds)
    );

    $sql = "
        SELECT
            id,
            theme_id,
            cg_code
        FROM observation_items
        WHERE theme_id IN ($placeholders)$itemRetired
        ORDER BY item_order ASC
    ";

    $stmt = $conn->prepare($sql);

    $stmt->bind_param(
        $types,
        ...$themeIds
    );

    $stmt->execute();

    $itemResult = $stmt->get_result();

    // ---------------------------------------------------------------------
    // GET CURRICULAR GOALS
    //
    // observation_items stores the CG code as a string.
    // We derive the CG number from the code and match it with the
    // corresponding curricular goal.
    //
    // Example:
    // C-8.3
    //     ↓
    // CG number = 8
    // ---------------------------------------------------------------------

    $cgResult = $conn->query(
        'SELECT id, goal_text
         FROM curricular_goals'
    );

    $cgByNumber = [];

    while ($row = $cgResult->fetch_assoc()) {

        // Find CG number from goal text.
        //
        // Example:
        // "CG-8 ..."
        //     ↓
        // number = 8
        //
        if (
            preg_match(
                '/CG-(\d+)/',
                $row['goal_text'],
                $m
            )
        ) {

            $cgNumber = (int) $m[1];

            $cgByNumber[$cgNumber] = [
                'id'        => (int) $row['id'],
                'goal_text' => $row['goal_text']
            ];
        }
    }

    // ---------------------------------------------------------------------
    // BUILD OBSERVATION ITEMS
    // ---------------------------------------------------------------------

    while ($row = $itemResult->fetch_assoc()) {

        $item = [
            'id'                => (int) $row['id'],
            'cg_code'           => $row['cg_code'],
            'curricular_goal_id'=> null,
            'goal_text'         => null
        ];

        // Extract the numeric CG reference from cg_code.
        //
        // Examples:
        // C-8.3  -> 8
        // CG-4.2 -> 4
        // 10.8   -> 10
        //
        if (
            preg_match(
                '/(\d+)/',
                $row['cg_code'],
                $m
            )
        ) {

            $cgNumber = (int) $m[1];

            if (isset($cgByNumber[$cgNumber])) {

                $item['curricular_goal_id'] =
                    $cgByNumber[$cgNumber]['id'];

                $item['goal_text'] =
                    $cgByNumber[$cgNumber]['goal_text'];
            }
        }

        $themeId = (int) $row['theme_id'];

        if (isset($themes[$themeId])) {

            $themes[$themeId]['items'][] = $item;
        }
    }

    $stmt->close();
}

// -------------------------------------------------------------------------
// CLOSE DATABASE CONNECTION
// -------------------------------------------------------------------------

$conn->close();

// -------------------------------------------------------------------------
// RETURN JSON RESPONSE
// -------------------------------------------------------------------------

echo json_encode([
    'status' => 'success',
    'themes' => array_values($themes)
]);