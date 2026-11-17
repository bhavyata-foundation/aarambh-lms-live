<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

set_exception_handler(function (Throwable $e) {
    http_response_code(500);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Server error.'
    ]);

    exit;
});

session_start();

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

$devRole = $_SESSION['dev_role'] ?? null;

if (
    $devRole !== 'supervisor' &&
    $devRole !== 'superadmin' &&
    empty($_SESSION['user_id'])
) {
    http_response_code(401);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Unauthorized.'
    ]);

    exit;
}

$role = $devRole ?: ($_SESSION['role'] ?? '');

if (!in_array($role, ['supervisor', 'superadmin'], true)) {
    http_response_code(403);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Access denied.'
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| Database
|--------------------------------------------------------------------------
*/

require_once __DIR__ . '/../users/db_config.php';

/*
|--------------------------------------------------------------------------
| Input
|--------------------------------------------------------------------------
*/

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = $_POST;
}

$issueId  = isset($input['issue_id']) ? (int) $input['issue_id'] : 0;
$response = trim((string) ($input['response'] ?? ''));

if ($issueId <= 0) {
    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Issue ID is required.'
    ]);

    exit;
}

if ($response === '') {
    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Response is required.'
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| Save Response
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare("
    UPDATE compliance_issues
    SET
        response = ?,
        status = 'responded'
    WHERE issue_id = ?
");

$stmt->bind_param(
    'si',
    $response,
    $issueId
);

$stmt->execute();

if ($stmt->affected_rows === 0) {
    $check = $conn->prepare("
        SELECT issue_id
        FROM compliance_issues
        WHERE issue_id = ?
        LIMIT 1
    ");

    $check->bind_param('i', $issueId);
    $check->execute();

    $result = $check->get_result();

    if ($result->num_rows === 0) {
        $check->close();
        $stmt->close();

        http_response_code(404);

        echo json_encode([
            'status'  => 'error',
            'message' => 'Compliance issue not found.'
        ]);

        exit;
    }

    $check->close();
}

$stmt->close();

/*
|--------------------------------------------------------------------------
| Response
|--------------------------------------------------------------------------
*/

echo json_encode([
    'status'   => 'success',
    'message'  => 'Response saved successfully.',
    'issue_id' => $issueId
]);