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

$classId  = isset($_GET['class_id']) ? (int) $_GET['class_id'] : 0;
$schoolId = isset($_GET['school_id']) ? (int) $_GET['school_id'] : 0;

/*
|--------------------------------------------------------------------------
| Query
|--------------------------------------------------------------------------
*/

$sql = "
    SELECT
        ci.issue_id,
        ci.class_id,
        ci.school_id,
        ci.category,
        ci.description,
        ci.severity,
        ci.supervisor_user_id,
        ci.status,
        ci.response,
        ci.resolved_at,
        ci.created_at
    FROM compliance_issues ci
    WHERE 1 = 1
";

$params = [];
$types  = '';

if ($classId > 0) {
    $sql .= " AND ci.class_id = ?";
    $types .= 'i';
    $params[] = $classId;
}

if ($schoolId > 0) {
    $sql .= " AND ci.school_id = ?";
    $types .= 'i';
    $params[] = $schoolId;
}

$sql .= " ORDER BY ci.created_at DESC, ci.issue_id DESC";

$stmt = $conn->prepare($sql);

if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();

$result = $stmt->get_result();

$issues = [];

while ($row = $result->fetch_assoc()) {
    $issues[] = $row;
}

$stmt->close();

/*
|--------------------------------------------------------------------------
| Response
|--------------------------------------------------------------------------
*/

echo json_encode([
    'status' => 'success',
    'issues' => $issues
]);