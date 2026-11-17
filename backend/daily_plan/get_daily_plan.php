<?php

// ============================================================
// GET DAILY PLAN
// ------------------------------------------------------------
// Loads:
//   1. Master Foundation activity from domain_activities
//   2. Teacher/class custom plan from teacher_daily_plans
//   3. Completion state from domain_completion
//
// File:
// backend/daily_plan/get_daily_plan.php
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
// TEACHER ID
// ------------------------------------------------------------

$teacherId =
    isset($_SESSION['user_id'])
        ? (int) $_SESSION['user_id']
        : ($devRole ? 49 : null);

if (!$teacherId) {

    http_response_code(401);

    echo json_encode([
        'status' => 'error',
        'message' => 'Could not determine teacher.'
    ]);

    exit;
}


// ------------------------------------------------------------
// INPUT
// ------------------------------------------------------------

$classId = filter_var(
    $_GET['class_id'] ?? null,
    FILTER_VALIDATE_INT
);

$weekNumber = filter_var(
    $_GET['week_number'] ?? null,
    FILTER_VALIDATE_INT
);

if (
    !$classId ||
    !$weekNumber
) {

    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' =>
            'class_id and week_number are required.'
    ]);

    exit;
}


// ------------------------------------------------------------
// DATABASE
// ------------------------------------------------------------

require_once __DIR__ . '/../users/db_config.php';

$conn = get_db_connection();


// ------------------------------------------------------------
// VERIFY CLASS BELONGS TO TEACHER
// ------------------------------------------------------------

$stmt = $conn->prepare(
    "
    SELECT
        id,
        school_id,
        name

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

$class =
    $stmt
        ->get_result()
        ->fetch_assoc();

$stmt->close();

if (!$class) {

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
    SELECT
        id,
        term_id,
        week_number,
        theme_name,
        start_date,
        end_date,
        value_text,
        link_text

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
// MASTER ACTIVITIES
// ------------------------------------------------------------

$masterActivities = [];

$stmt = $conn->prepare(
    "
    SELECT
        id,
        domain_key,
        day,
        activity_text

    FROM domain_activities

    WHERE week_id = ?

    ORDER BY
        FIELD(
            day,
            'mon',
            'tue',
            'wed',
            'thu',
            'fri'
        ),
        FIELD(
            domain_key,
            'welcome',
            'story',
            'numeracy',
            'language',
            'create',
            'outdoor',
            'tidy',
            'reflect'
        )
    "
);

$stmt->bind_param(
    'i',
    $weekId
);

$stmt->execute();

$result =
    $stmt->get_result();

while ($row = $result->fetch_assoc()) {

    $key =
        $row['day'] .
        '-' .
        $row['domain_key'];

    $masterActivities[$key] = [
        'id' =>
            (int) $row['id'],

        'day' =>
            $row['day'],

        'domain_key' =>
            $row['domain_key'],

        'activity_text' =>
            $row['activity_text']
    ];
}

$stmt->close();


// ------------------------------------------------------------
// TEACHER'S SAVED PLANS
// ------------------------------------------------------------

$plans = [];

$stmt = $conn->prepare(
    "
    SELECT
        id,
        domain_key,
        day,
        plan_text,
        materials_json,
        used_suggestion,
        updated_by,
        created_at,
        updated_at

    FROM teacher_daily_plans

    WHERE class_id = ?
      AND week_id = ?
    "
);

$stmt->bind_param(
    'ii',
    $classId,
    $weekId
);

$stmt->execute();

$result =
    $stmt->get_result();

while ($row = $result->fetch_assoc()) {

    $key =
        $row['day'] .
        '-' .
        $row['domain_key'];

    $materials = [];

    if (
        isset($row['materials_json']) &&
        $row['materials_json'] !== ''
    ) {

        $decoded =
            json_decode(
                $row['materials_json'],
                true
            );

        if (is_array($decoded)) {
            $materials = $decoded;
        }
    }

    $plans[$key] = [
        'id' =>
            (int) $row['id'],

        'day' =>
            $row['day'],

        'domain_key' =>
            $row['domain_key'],

        'plan_text' =>
            $row['plan_text'] ?? '',

        'materials' =>
            $materials,

        'used_suggestion' =>
            (bool) $row['used_suggestion'],

        'updated_by' =>
            (int) $row['updated_by'],

        'created_at' =>
            $row['created_at'],

        'updated_at' =>
            $row['updated_at']
    ];
}

$stmt->close();


// ------------------------------------------------------------
// COMPLETION
// ------------------------------------------------------------

$completion = [];

$stmt = $conn->prepare(
    "
    SELECT
        id,
        domain_key,
        day,
        completed_by,
        completed_at,
        covered_date

    FROM domain_completion

    WHERE class_id = ?
      AND week_id = ?
    "
);

$stmt->bind_param(
    'ii',
    $classId,
    $weekId
);

$stmt->execute();

$result =
    $stmt->get_result();

while ($row = $result->fetch_assoc()) {

    $key =
        $row['day'] .
        '-' .
        $row['domain_key'];

    $completion[$key] = [
        'id' =>
            (int) $row['id'],

        'completed' =>
            true,

        'completed_by' =>
            (int) $row['completed_by'],

        'completed_at' =>
            $row['completed_at'],

        'covered_date' =>
            $row['covered_date']
    ];
}

$stmt->close();

$conn->close();


// ------------------------------------------------------------
// RESPONSE
// ------------------------------------------------------------

echo json_encode(
    [
        'status' => 'success',

        'class' => [
            'id' =>
                (int) $class['id'],

            'school_id' =>
                (int) $class['school_id'],

            'name' =>
                $class['name']
        ],

        'week' => [
            'id' =>
                $weekId,

            'term_id' =>
                (int) $week['term_id'],

            'week_number' =>
                (int) $week['week_number'],

            'theme_name' =>
                $week['theme_name'],

            'start_date' =>
                $week['start_date'],

            'end_date' =>
                $week['end_date'],

            'value_text' =>
                $week['value_text'],

            'link_text' =>
                $week['link_text']
        ],

        'master_activities' =>
            $masterActivities,

        'plans' =>
            $plans,

        'completion' =>
            $completion
    ],
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES
);