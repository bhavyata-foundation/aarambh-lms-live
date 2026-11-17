<?php

// ============================================================
// SAVE DAILY PLAN
// ------------------------------------------------------------
// Saves teacher-specific plan into teacher_daily_plans.
//
// Also optionally updates domain_completion.
//
// File:
// backend/daily_plan/save_daily_plan.php
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

$planText =
    trim(
        (string) (
            $input['plan_text'] ?? ''
        )
    );

$materials =
    $input['materials'] ?? [];

$usedSuggestion =
    !empty(
        $input['used_suggestion']
    )
        ? 1
        : 0;


// ------------------------------------------------------------
// OPTIONAL COMPLETION
// ------------------------------------------------------------

$hasCompletionField =
    array_key_exists(
        'completed',
        $input
    );

$completed =
    $hasCompletionField
        ? (bool) $input['completed']
        : null;

// When the day this session was originally scheduled for turned out
// to be a holiday, the teacher covers it on a different real date —
// coveredDate records that, so a session marked done can honestly say
// when it actually happened, not just that it happened at some point.
$coveredDate =
    !empty($input['covered_date']) &&
    preg_match('/^\d{4}-\d{2}-\d{2}$/', $input['covered_date'])
        ? $input['covered_date']
        : null;


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

if (
    !in_array(
        $domainKey,
        $validDomains,
        true
    )
) {

    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid domain_key.'
    ]);

    exit;
}

if (
    !in_array(
        $day,
        $validDays,
        true
    )
) {

    http_response_code(400);

    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid day.'
    ]);

    exit;
}

if (!is_array($materials)) {
    $materials = [];
}

$materials =
    array_values(
        array_filter(
            array_map(
                function ($item) {

                    return trim(
                        (string) $item
                    );
                },
                $materials
            ),
            function ($item) {

                return $item !== '';
            }
        )
    );

$materialsJson =
    json_encode(
        $materials,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );


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
// RESOLVE WEEK NUMBER -> WEEK ID
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
// TRANSACTION
// ------------------------------------------------------------

$conn->begin_transaction();

try {

    // --------------------------------------------------------
    // UPSERT TEACHER PLAN
    // --------------------------------------------------------

    $stmt = $conn->prepare(
        "
        INSERT INTO teacher_daily_plans
        (
            class_id,
            week_id,
            domain_key,
            day,
            plan_text,
            materials_json,
            used_suggestion,
            updated_by
        )

        VALUES
        (
            ?, ?, ?, ?, ?, ?, ?, ?
        )

        ON DUPLICATE KEY UPDATE

            plan_text =
                VALUES(plan_text),

            materials_json =
                VALUES(materials_json),

            used_suggestion =
                VALUES(used_suggestion),

            updated_by =
                VALUES(updated_by),

            updated_at =
                CURRENT_TIMESTAMP
        "
    );

    $stmt->bind_param(
        'iissssii',
        $classId,
        $weekId,
        $domainKey,
        $day,
        $planText,
        $materialsJson,
        $usedSuggestion,
        $teacherId
    );

    $stmt->execute();

    $stmt->close();


    // --------------------------------------------------------
    // COMPLETION WAS INCLUDED
    // --------------------------------------------------------

    if ($hasCompletionField) {

        if ($completed) {

            $stmt = $conn->prepare(
                "
                INSERT INTO domain_completion
                (
                    class_id,
                    week_id,
                    domain_key,
                    day,
                    completed_by,
                    completed_at,
                    covered_date
                )

                VALUES
                (
                    ?, ?, ?, ?, ?, NOW(), ?
                )

                ON DUPLICATE KEY UPDATE

                    completed_by =
                        VALUES(completed_by),

                    completed_at =
                        NOW(),

                    covered_date =
                        VALUES(covered_date)
                "
            );

            $stmt->bind_param(
                'iissis',
                $classId,
                $weekId,
                $domainKey,
                $day,
                $teacherId,
                $coveredDate
            );

            $stmt->execute();

            $stmt->close();

        } else {

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

            $stmt->close();
        }
    }


    // --------------------------------------------------------
    // GET SAVED PLAN ID
    // --------------------------------------------------------

    $stmt = $conn->prepare(
        "
        SELECT
            id,
            created_at,
            updated_at

        FROM teacher_daily_plans

        WHERE class_id = ?
          AND week_id = ?
          AND domain_key = ?
          AND day = ?

        LIMIT 1
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

    $saved =
        $stmt
            ->get_result()
            ->fetch_assoc();

    $stmt->close();


    // --------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------

    $conn->commit();

    $conn->close();


    echo json_encode(
        [
            'status' => 'success',

            'message' =>
                'Daily plan saved.',

            'plan' => [
                'id' =>
                    isset($saved['id'])
                        ? (int) $saved['id']
                        : null,

                'class_id' =>
                    $classId,

                'week_id' =>
                    $weekId,

                'week_number' =>
                    $weekNumber,

                'domain_key' =>
                    $domainKey,

                'day' =>
                    $day,

                'plan_text' =>
                    $planText,

                'materials' =>
                    $materials,

                'used_suggestion' =>
                    (bool) $usedSuggestion,

                'completed' =>
                    $hasCompletionField
                        ? $completed
                        : null,

                'covered_date' =>
                    $coveredDate,

                'created_at' =>
                    $saved['created_at'] ??
                    null,

                'updated_at' =>
                    $saved['updated_at'] ??
                    null
            ]
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );

} catch (Throwable $e) {

    $conn->rollback();

    $conn->close();

    http_response_code(500);

    echo json_encode([
        'status' => 'error',
        'message' =>
            'Could not save daily plan.'
    ]);
}