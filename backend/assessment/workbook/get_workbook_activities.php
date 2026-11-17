<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');

$isLocalRequest = in_array(
    $requestHost,
    ['localhost', '127.0.0.1'],
    true
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

/*
|--------------------------------------------------------------------------
| Parameters
|--------------------------------------------------------------------------
*/

$level = trim($_GET['level'] ?? '');
$month = trim($_GET['month'] ?? '');

if ($level === '') {

    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' => 'level is required.'
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| Database
|--------------------------------------------------------------------------
*/

require_once __DIR__ . '/../../users/db_config.php';

$conn = get_db_connection();

if (!$conn) {

    http_response_code(500);

    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed.'
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| Fetch activities
|
| Important:
| We use the existing workbooks table.
| JK-01 = Khelika Part 1
| JK-02 = Vaani Part 1
|--------------------------------------------------------------------------
*/

$sql = "
    SELECT
        w.id AS workbook_id,
        w.book_code,
        w.name AS workbook_name,
        w.level,

        a.id AS activity_id,
        a.activity_code,
        a.page_number,
        a.activity_no,
        a.activity_title,
        a.topic,
        a.cg_code,
        a.cg_group,
        a.month_scheduled,

        s.scan_key

    FROM workbooks w

    INNER JOIN workbook_activities a
        ON a.workbook_id = w.id
        AND a.assessable = 1

    LEFT JOIN workbook_page_scan_map s
        ON s.workbook_id = w.id
        AND s.page_number = a.page_number

    WHERE w.level = ?
";

$params = [$level];
$types = 's';

if ($month !== '') {

    $sql .= "
        AND a.month_scheduled = ?
    ";

    $params[] = $month;
    $types .= 's';
}

$sql .= "
    ORDER BY
        w.id ASC,
        a.page_number ASC,
        a.activity_no ASC
";

/*
|--------------------------------------------------------------------------
| Prepare
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare($sql);

if (!$stmt) {

    http_response_code(500);

    echo json_encode([
        'status' => 'error',
        'message' => 'Could not prepare query.',
        'sql_error' => $conn->error
    ]);

    $conn->close();

    exit;
}

/*
|--------------------------------------------------------------------------
| Bind parameters
|--------------------------------------------------------------------------
*/

$stmt->bind_param(
    $types,
    ...$params
);

/*
|--------------------------------------------------------------------------
| Execute
|--------------------------------------------------------------------------
*/

if (!$stmt->execute()) {

    http_response_code(500);

    echo json_encode([
        'status' => 'error',
        'message' => 'Could not execute query.',
        'sql_error' => $stmt->error
    ]);

    $stmt->close();
    $conn->close();

    exit;
}

$result = $stmt->get_result();

/*
|--------------------------------------------------------------------------
| Build response
|--------------------------------------------------------------------------
*/

$books = [];

while ($row = $result->fetch_assoc()) {

    $workbookId = (int)$row['workbook_id'];

    $pageNumber = (int)$row['page_number'];

    /*
    |--------------------------------------------------------------------------
    | Create workbook
    |--------------------------------------------------------------------------
    */

    if (!isset($books[$workbookId])) {

        $books[$workbookId] = [
            'id' => $workbookId,
            'book_code' => $row['book_code'],
            'name' => $row['workbook_name'],
            'level' => $row['level'],

            'activities' => [],

            'pages' => []
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Create page
    |--------------------------------------------------------------------------
    */

    if (!isset(
        $books[$workbookId]['pages'][$pageNumber]
    )) {

        $books[$workbookId]['pages'][$pageNumber] = [

            'page_number' => $pageNumber,

            'scan_key' => $row['scan_key'],

            'month' => $row['month_scheduled'],

            'activities' => []
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Activity
    |--------------------------------------------------------------------------
    */

    $activity = [

        'id' => (int)$row['activity_id'],

        'activity_code' => $row['activity_code'],

        'page_number' => $pageNumber,

        'activity_no' => (int)$row['activity_no'],

        'activity_title' => $row['activity_title'],

        'topic' => $row['topic'],

        'cg_code' => $row['cg_code'],

        'cg_group' => $row['cg_group'],

        'month' => $row['month_scheduled'],

        'scan_key' => $row['scan_key']
    ];

    /*
    |--------------------------------------------------------------------------
    | Add to workbook activity list
    |--------------------------------------------------------------------------
    */

    $books[$workbookId]['activities'][] = $activity;

    /*
    |--------------------------------------------------------------------------
    | Add to page activity list
    |--------------------------------------------------------------------------
    */

    $books[$workbookId]['pages'][$pageNumber]['activities'][] = $activity;
}

$stmt->close();
$conn->close();

/*
|--------------------------------------------------------------------------
| Convert associative pages to normal arrays
|--------------------------------------------------------------------------
*/

foreach ($books as &$book) {

    $book['pages'] = array_values(
        $book['pages']
    );
}

unset($book);

/*
|--------------------------------------------------------------------------
| Response
|--------------------------------------------------------------------------
*/

echo json_encode(

    [
        'status' => 'success',

        'books' => array_values($books)
    ],

    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES
);