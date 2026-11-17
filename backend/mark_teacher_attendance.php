<?php

declare(strict_types=1);

ini_set('display_errors', '0');

mysqli_report(
    MYSQLI_REPORT_ERROR |
    MYSQLI_REPORT_STRICT
);

set_exception_handler(function (Throwable $e) {

    error_log(
        'mark_teacher_attendance.php: ' .
        $e->getMessage()
    );

    http_response_code(500);

    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
        'status'  => 'error',
        'message' => 'Server error while saving attendance.'
    ]);

    exit;
});


session_start();

header('Content-Type: application/json; charset=utf-8');


/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/

$requestHost = strtok(
    $_SERVER['HTTP_HOST'] ?? '',
    ':'
);

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

$input = json_decode(
    file_get_contents('php://input'),
    true
);

if (!is_array($input)) {
    $input = [];
}

$date = trim(
    (string)($input['date'] ?? '')
);

$status = trim(
    (string)($input['status'] ?? '')
);


if (
    $date === '' ||
    !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)
) {

    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'A valid date is required.'
    ]);

    exit;
}


if (
    !in_array(
        $status,
        ['present', 'absent', 'leave'],
        true
    )
) {

    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Invalid attendance status.'
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
| TEACHER ID
|--------------------------------------------------------------------------
*/

if (isset($_SESSION['user_id'])) {

    $teacherId =
        (int)$_SESSION['user_id'];

} else {

    $conn->close();

    http_response_code(401);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Teacher session was not found.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| SAVE
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare(
    "
    INSERT INTO teacher_attendance
        (
            teacher_user_id,
            date,
            status,
            marked_at
        )
    VALUES
        (?, ?, ?, NOW())

    ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        marked_at = NOW()
    "
);

$stmt->bind_param(
    'iss',
    $teacherId,
    $date,
    $status
);

$stmt->execute();

$stmt->close();


/*
|--------------------------------------------------------------------------
| READ SAVED RECORD
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare(
    "
    SELECT
        date,
        status,
        marked_at
    FROM teacher_attendance
    WHERE teacher_user_id = ?
      AND date = ?
    LIMIT 1
    "
);

$stmt->bind_param(
    'is',
    $teacherId,
    $date
);

$stmt->execute();

$record =
    $stmt->get_result()->fetch_assoc();

$stmt->close();

$conn->close();


echo json_encode([
    'status' => 'success',
    'record' => [
        'date' =>
            $record['date'] ?? $date,

        'status' =>
            $record['status'] ?? $status,

        'marked_at' =>
            $record['marked_at'] ?? null
    ]
]);

exit;