<?php

// ============================================================
// DELETE DAILY PLAN
// ------------------------------------------------------------
// Deletes teacher's custom plan for one slot.
//
// Optional:
// clear_completion = true
// also removes the class completion mark.
//
// Never deletes domain_activities.
// ============================================================

session_start();

header('Content-Type: application/json; charset=utf-8');

mysqli_report(
    MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT
);

ini_set('display_errors', '0');


// ------------------------------------------------------------
// ERROR HANDLER
// ------------------------------------------------------------

set_exception_handler(function ($e) {

    http_response_code(500);

    echo json_encode([
        'status' => 'error',
        'message' => 'Server error.'
    ]);

    exit;
});


// ------------------------------------------------------------
// AUTH
// ------------------------------------------------------------

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
    $_SESSION['role'] ??
    $devRole;

if ($effectiveRole !== 'teacher') {

    http_response_code(401);

    echo json_encode([
        'status' => 'error',
        'message' => 'Not authorized.'
    ]);

    exit;
}


// ------------------------------------------------------------
// TEACHER
// ------------------------------------------------------------

$teacherId =
    isset($_SESSION['user_id'])
        ? (int) $_SESSION['user_id']
        : ($devRole ? 49 : null);

if (!$teacherId) {

    http_response_code(401);

    echo json_encode([
        'status' => 'error',
        'message' =>
            'Could not determine teacher.'
    ]);

    exit;
}


// ------------------------------------------------------------
// INPUT
// ------------------------------------------------------------

$input =
    json_decode(
        file_get_contents('php://input'),
        true
    );

if (!is_array($input)) {

    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid JSON.'
    ]);

    exit;
}


$classId =
    filter_var(
        $input['class_id'] ?? null,
        FILTER_VALIDATE_INT
    );

$weekNumber =
    filter_var(
        $input['week_number'] ?? null,
        FILTER_VALIDATE_INT
    );

$domainKey =
    trim(
        (string) (
            $input['domain_key'] ?? ''
        )
    );

$day =
    trim(
        (string) (
            $input['day'] ?? ''
        )
    );

$clearCompletion =
    !empty(
        $input['clear_completion']
    );


// ------------------------------------------------------------
// VALIDATE
// ------------------------------------------------------------

$validDomains = [
    'welcome',
    'story',
    'numeracy',
    'language',
    'create',
    'outdoor',
    'tidy',
    'reflect'
];

$validDays = [
    'mon',
    'tue',
    'wed',
    'thu',
    'fri'
];

if (
    !$classId ||
    !$weekNumber ||
    !in_array(
        $domainKey,
        $validDomains,
        true
    ) ||
    !in_array(
        $day,
        $validDays,
        true
    )
) {

    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' =>
            'Missing or invalid fields.'
    ]);

    exit;
}


// ------------------------------------------------------------
// DATABASE
// ------------------------------------------------------------

require_once __DIR__ . '/../users/db_config.php';

$conn = get_db_connection();


// ------------------------------------------------------------
// VERIFY CLASS OWNERSHIP
// ------------------------------------------------------------

$stmt = $conn->prepare(
    "
    SELECT id

    FROM classes

    WHERE id = ?
      AND teacher_user_id = ?

    LIMIT 1
    "
);

$stmt->bind_param(
    'ii',
    $classId,
    $teacherId
);

$stmt->execute();

$classExists =
    $stmt
        ->get_result()
        ->fetch_assoc();

$stmt->close();

if (!$classExists) {

    $conn->close();

    http_response_code(403);

    echo json_encode([
        'status' => 'error',
        'message' =>
            'This class does not belong to the logged-in teacher.'
    ]);

    exit;
}


// ------------------------------------------------------------
// GET WEEK
// ------------------------------------------------------------

$stmt = $conn->prepare(
    "
    SELECT id

    FROM weeks

    WHERE week_number = ?

    ORDER BY
        start_date DESC,
        id DESC

    LIMIT 1
    "
);

$stmt->bind_param(
    'i',
    $weekNumber
);

$stmt->execute();

$week =
    $stmt
        ->get_result()
        ->fetch_assoc();

$stmt->close();

if (!$week) {

    $conn->close();

    http_response_code(404);

    echo json_encode([
        'status' => 'error',
        'message' =>
            'Week not found in database.'
    ]);

    exit;
}

$weekId =
    (int) $week['id'];


// ------------------------------------------------------------
// DELETE
// ------------------------------------------------------------

$conn->begin_transaction();

try {

    $stmt = $conn->prepare(
        "
        DELETE FROM teacher_daily_plans

        WHERE class_id = ?
          AND week_id = ?
          AND domain_key = ?
          AND day = ?
        "
    );

    $stmt->bind_param(
        'iiss',
        $classId,
        $weekId,
        $domainKey,
        $day
    );

    $stmt->execute();

    $planDeleted =
        $stmt->affected_rows;

    $stmt->close();


    if ($clearCompletion) {

        $stmt = $conn->prepare(
            "
            DELETE FROM domain_completion

            WHERE class_id = ?
              AND week_id = ?
              AND domain_key = ?
              AND day = ?
            "
        );

        $stmt->bind_param(
            'iiss',
            $classId,
            $weekId,
            $domainKey,
            $day
        );

        $stmt->execute();

        $completionDeleted =
            $stmt->affected_rows;

        $stmt->close();

    } else {

        $completionDeleted = 0;
    }


    $conn->commit();

    $conn->close();


    echo json_encode([
        'status' => 'success',

        'message' =>
            'Daily plan removed.',

        'plan_deleted' =>
            $planDeleted > 0,

        'completion_deleted' =>
            $completionDeleted > 0
    ]);

} catch (Throwable $e) {

    $conn->rollback();

    $conn->close();

    http_response_code(500);

    echo json_encode([
        'status' => 'error',
        'message' =>
            'Could not delete daily plan.'
    ]);
}