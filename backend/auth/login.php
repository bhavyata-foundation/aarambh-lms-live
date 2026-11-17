<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| ERROR HANDLING
|--------------------------------------------------------------------------
*/

header('Content-Type: application/json; charset=utf-8');

ini_set('display_errors', '0');

mysqli_report(
    MYSQLI_REPORT_ERROR |
    MYSQLI_REPORT_STRICT
);

set_exception_handler(function (Throwable $e) {

    http_response_code(500);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);

    exit;
});


/*
|--------------------------------------------------------------------------
| SESSION
|--------------------------------------------------------------------------
*/

session_start();


/*
|--------------------------------------------------------------------------
| DATABASE CONFIG
|--------------------------------------------------------------------------
*/

require_once __DIR__ . '/../users/db_config.php';


/*
|--------------------------------------------------------------------------
| READ REQUEST
|--------------------------------------------------------------------------
*/

$input = json_decode(
    file_get_contents('php://input'),
    true
);

if (!is_array($input)) {
    $input = [];
}


$email = trim(
    (string) (
        $input['email'] ?? ''
    )
);


$password =
    (string) (
        $input['password'] ?? ''
    );


/*
|--------------------------------------------------------------------------
| VALIDATION
|--------------------------------------------------------------------------
*/

if (
    $email === '' ||
    $password === ''
) {

    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Email and password are both required.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| DATABASE CONNECTION
|--------------------------------------------------------------------------
*/

$conn = get_db_connection();


/*
|--------------------------------------------------------------------------
| FIND USER
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare(
    "
    SELECT
        id,
        name,
        email,
        password_hash,
        role
    FROM users
    WHERE email = ?
      AND (status IS NULL OR status = 'active') -- a switched-off login can't sign in
    LIMIT 1
    "
);


$stmt->bind_param(
    's',
    $email
);


$stmt->execute();


$result =
    $stmt->get_result();


$user =
    $result->fetch_assoc();


$stmt->close();


/*
|--------------------------------------------------------------------------
| VERIFY PASSWORD
|--------------------------------------------------------------------------
*/

if (
    !$user ||
    !password_verify(
        $password,
        $user['password_hash']
    )
) {

    $conn->close();

    http_response_code(401);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Incorrect email or password.'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| LOGIN SUCCESS
|--------------------------------------------------------------------------
*/

session_regenerate_id(true);


$_SESSION['user_id'] =
    (int) $user['id'];

$_SESSION['name'] =
    $user['name'];

$_SESSION['email'] =
    $user['email'];

$_SESSION['role'] =
    $user['role'];


$conn->close();


/*
|--------------------------------------------------------------------------
| RESPONSE
|--------------------------------------------------------------------------
*/

echo json_encode([
    'status' => 'success',
    'name'   => $user['name'],
    'role'   => $user['role']
]);

exit;