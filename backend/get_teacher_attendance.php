<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| GET TEACHER ATTENDANCE
|--------------------------------------------------------------------------
| File:
| backend/get_teacher_attendance.php
|--------------------------------------------------------------------------
*/

ini_set('display_errors', '0');

mysqli_report(
    MYSQLI_REPORT_ERROR |
    MYSQLI_REPORT_STRICT
);

set_exception_handler(function (Throwable $e) {

    error_log(
        'get_teacher_attendance.php: ' .
        $e->getMessage()
    );

    http_response_code(500);

    header(
        'Content-Type: application/json; charset=utf-8'
    );

    echo json_encode([
        'status'  => 'error',
        'message' =>
            'Server error while loading attendance.'
    ]);

    exit;
});


/*
|--------------------------------------------------------------------------
| SESSION
|--------------------------------------------------------------------------
*/

session_start();

header(
    'Content-Type: application/json; charset=utf-8'
);


/*
|--------------------------------------------------------------------------
| AUTHORIZATION
|--------------------------------------------------------------------------
*/

$requestHost = strtok(
    $_SERVER['HTTP_HOST'] ?? '',
    ':'
);

$isLocalRequest = in_array(
    $requestHost,
    [
        'localhost',
        '127.0.0.1'
    ],
    true
);

$devRole = (
    $isLocalRequest &&
    isset($_GET['dev_role'])
)
    ? $_GET['dev_role']
    : null;

$effectiveRole =
    $_SESSION['role'] ?? $devRole;


if ($effectiveRole !== 'teacher') {

    http_response_code(401);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Not authorized.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| INPUT
|--------------------------------------------------------------------------
*/

$year = filter_var(
    $_GET['year'] ?? null,
    FILTER_VALIDATE_INT
);

$month = filter_var(
    $_GET['month'] ?? null,
    FILTER_VALIDATE_INT
);


/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
| JavaScript month:
| January = 0
| September = 8
|--------------------------------------------------------------------------
*/

if (
    $year === false ||
    $year === null ||
    $month === false ||
    $month === null ||
    $month < 0 ||
    $month > 11
) {

    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' =>
            'Missing or invalid year/month.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| DATABASE
|--------------------------------------------------------------------------
*/

require_once __DIR__ . '/users/db_config.php';

$conn = get_db_connection();


/*
|--------------------------------------------------------------------------
| DETERMINE TEACHER
|--------------------------------------------------------------------------
*/

if (isset($_SESSION['user_id'])) {

    $teacherId =
        (int)$_SESSION['user_id'];

} elseif (
    $isLocalRequest &&
    $devRole === 'teacher'
) {

    $lookup = $conn->query(
        "
        SELECT id
        FROM users
        WHERE role = 'teacher'
        ORDER BY id
        LIMIT 1
        "
    );

    $row =
        $lookup->fetch_assoc();

    if (!$row) {

        $conn->close();

        echo json_encode([
            'status'  => 'success',
            'records' => []
        ]);

        exit;
    }

    $teacherId =
        (int)$row['id'];

} else {

    $conn->close();

    http_response_code(401);

    echo json_encode([
        'status'  => 'error',
        'message' =>
            'Teacher session was not found.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| LOAD MONTH
|--------------------------------------------------------------------------
*/

$monthNum =
    $month + 1;

$stmt = $conn->prepare(
    "
    SELECT
        date,
        status,
        marked_at
    FROM teacher_attendance
    WHERE teacher_user_id = ?
      AND YEAR(date) = ?
      AND MONTH(date) = ?
    ORDER BY date ASC
    "
);

$stmt->bind_param(
    'iii',
    $teacherId,
    $year,
    $monthNum
);

$stmt->execute();

$result =
    $stmt->get_result();

$records = [];

while ($row = $result->fetch_assoc()) {

    $records[$row['date']] = [
        'status' =>
            $row['status'],

        'marked_at' =>
            $row['marked_at']
    ];
}

$stmt->close();

$conn->close();


/*
|--------------------------------------------------------------------------
| RESPONSE
|--------------------------------------------------------------------------
*/

echo json_encode([
    'status'  => 'success',
    'records' => $records
]);

exit;