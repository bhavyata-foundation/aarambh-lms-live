<?php

// =========================================================================
// ADD COMPLIANCE ISSUE — a supervisor raises a real compliance concern
// against a specific teacher's class.
//
// Uses the real class_id / school_id linkage already used by PTM & Training.
// =========================================================================


// -------------------------------------------------------------------------
// Exception handling
// -------------------------------------------------------------------------

set_exception_handler(function ($e) {

    http_response_code(500);

    header('Content-Type: application/json');

    echo json_encode([
        'status'  => 'error',
        'message' => 'Server error: ' . $e->getMessage()
    ]);

    exit;
});


mysqli_report(
    MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT
);

ini_set('display_errors', '0');


// -------------------------------------------------------------------------
// Session and response
// -------------------------------------------------------------------------

session_start();

header('Content-Type: application/json');


// -------------------------------------------------------------------------
// Supervisor authorization
// -------------------------------------------------------------------------

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

$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'supervisor') {

    http_response_code(401);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Not authorized.'
    ]);

    exit;
}


// -------------------------------------------------------------------------
// Read JSON input
// -------------------------------------------------------------------------

$input = json_decode(
    file_get_contents('php://input'),
    true
) ?? [];


// -------------------------------------------------------------------------
// Read and normalize fields
// -------------------------------------------------------------------------

$classId = filter_var(
    $input['class_id'] ?? null,
    FILTER_VALIDATE_INT
);

$schoolId = filter_var(
    $input['school_id'] ?? null,
    FILTER_VALIDATE_INT
);

$category = trim(
    $input['category'] ?? ''
);

$description = trim(
    $input['description'] ?? ''
);

$severity = trim(
    $input['severity'] ?? 'medium'
);


// -------------------------------------------------------------------------
// Validate school and class
// -------------------------------------------------------------------------

if (!$classId || !$schoolId) {

    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'A school and class are required.'
    ]);

    exit;
}


// -------------------------------------------------------------------------
// Validate category and description
// -------------------------------------------------------------------------

if (
    $category === '' ||
    $description === ''
) {

    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Category and description are required.'
    ]);

    exit;
}


// -------------------------------------------------------------------------
// Validate severity
// -------------------------------------------------------------------------

if (!in_array(
    $severity,
    ['low', 'medium', 'high'],
    true
)) {
    $severity = 'medium';
}


// -------------------------------------------------------------------------
// Database connection
//
// This file:
// backend/compliance/add-compliance-issue.php
//
// db_config.php:
// backend/users/db_config.php
// -------------------------------------------------------------------------

require_once __DIR__ . '/../users/db_config.php';

$conn = get_db_connection();


// -------------------------------------------------------------------------
// Current supervisor
// -------------------------------------------------------------------------

$supervisorId = $_SESSION['user_id'] ?? null;


// -------------------------------------------------------------------------
// Insert compliance issue
// -------------------------------------------------------------------------

$stmt = $conn->prepare(
    "
    INSERT INTO compliance_issues
        (
            class_id,
            school_id,
            category,
            description,
            severity,
            supervisor_user_id
        )
    VALUES
        (?, ?, ?, ?, ?, ?)
    "
);

$stmt->bind_param(
    'iisssi',
    $classId,
    $schoolId,
    $category,
    $description,
    $severity,
    $supervisorId
);


// -------------------------------------------------------------------------
// Execute
// -------------------------------------------------------------------------

if ($stmt->execute()) {

    echo json_encode([
        'status'   => 'success',
        'issue_id' => $conn->insert_id
    ]);

} else {

    http_response_code(500);

    echo json_encode([
        'status'  => 'error',
        'message' => $stmt->error
    ]);
}


// -------------------------------------------------------------------------
// Close resources
// -------------------------------------------------------------------------

$stmt->close();
$conn->close();

?>