<?php

session_start();

header('Content-Type: application/json; charset=utf-8');


/*
|--------------------------------------------------------------------------
| LOCAL DEVELOPMENT CHECK
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


/*
|--------------------------------------------------------------------------
| OPTIONAL LOCAL DEV ROLE
|--------------------------------------------------------------------------
*/

if (
    $isLocalRequest &&
    isset($_GET['dev_role'])
) {

    $devRole = $_GET['dev_role'];

    if (
        in_array(
            $devRole,
            [
                'teacher',
                'supervisor',
                'superadmin',
                'parent',
                'principal'
            ],
            true
        )
    ) {

        echo json_encode([
            'status' => 'logged_in',
            'name' => 'Dev Preview (' . $devRole . ')',
            'email' => 'dev@localhost',
            'role' => $devRole,
            'is_previewing' => false
        ]);

        exit;
    }
}


/*
|--------------------------------------------------------------------------
| REAL SESSION CHECK
|--------------------------------------------------------------------------
*/

if (!isset($_SESSION['user_id'])) {

    http_response_code(401);

    echo json_encode([
        'status' => 'not_logged_in'
    ]);

    exit;
}


/*
|--------------------------------------------------------------------------
| RETURN SESSION
|--------------------------------------------------------------------------
*/

echo json_encode([
    'status' => 'logged_in',
    'name' => $_SESSION['name'] ?? '',
    'email' => $_SESSION['email'] ?? '',
    'role' => $_SESSION['role'] ?? '',
    'is_previewing' => isset($_SESSION['preview_original'])
]);

exit;