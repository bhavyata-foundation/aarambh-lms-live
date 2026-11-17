<?php

session_start();

header('Content-Type: application/json; charset=utf-8');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

/*
|--------------------------------------------------------------------------
| Error handling
|--------------------------------------------------------------------------
*/

set_exception_handler(function ($e) {
    http_response_code(500);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Server error.'
    ]);

    exit;
});

/*
|--------------------------------------------------------------------------
| Teacher authentication
|--------------------------------------------------------------------------
*/

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');

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
| Determine teacher
|--------------------------------------------------------------------------
*/

$teacherId = isset($_SESSION['user_id'])
    ? (int) $_SESSION['user_id']
    : ($devRole ? 49 : null);

if (!$teacherId) {

    http_response_code(401);

    echo json_encode([
        'status'  => 'error',
        'message' => 'Could not determine teacher.'
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| Class ID
|--------------------------------------------------------------------------
*/

$classId = filter_var(
    $_GET['class_id'] ?? null,
    FILTER_VALIDATE_INT
);

if (!$classId) {

    http_response_code(400);

    echo json_encode([
        'status'  => 'error',
        'message' => 'class_id is required.'
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| Database
|--------------------------------------------------------------------------
*/

require_once __DIR__ . '/../users/db_config.php';

$conn = get_db_connection();

/*
|--------------------------------------------------------------------------
| Verify that this class belongs to this teacher
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare(
    "SELECT id
     FROM classes
     WHERE id = ?
       AND teacher_user_id = ?
     LIMIT 1"
);

$stmt->bind_param(
    'ii',
    $classId,
    $teacherId
);

$stmt->execute();

$class = $stmt
    ->get_result()
    ->fetch_assoc();

$stmt->close();

if (!$class) {

    $conn->close();

    http_response_code(403);

    echo json_encode([
        'status'  => 'error',
        'message' => 'This class does not belong to the logged-in teacher.'
    ]);

    exit;
}

/*
|--------------------------------------------------------------------------
| Fetch pupils + existing Family & Parents information
|
| IMPORTANT:
| This is READ ONLY.
|
| Nothing is inserted, updated, deleted or modified in
| family_profiles.
|--------------------------------------------------------------------------
*/

$stmt = $conn->prepare(
    "SELECT
        p.id AS pupil_id,
        p.name AS pupil_name,
        p.register_no,
        f.guardians_json,
        f.willing_to_volunteer,
        f.workshop_skills,
        f.workshop_availability,
        f.teacher_approved,
        f.updated_at

     FROM pupils p

     LEFT JOIN family_profiles f
        ON f.pupil_id = p.id

     WHERE p.class_id = ?

     ORDER BY
        CASE
            WHEN p.register_no IS NULL OR p.register_no = ''
            THEN 1
            ELSE 0
        END,
        CAST(NULLIF(p.register_no, '') AS UNSIGNED),
        p.name"
);

$stmt->bind_param(
    'i',
    $classId
);

$stmt->execute();

$result = $stmt->get_result();

$roster = [];

/*
|--------------------------------------------------------------------------
| Build My Class roster
|--------------------------------------------------------------------------
*/

while ($row = $result->fetch_assoc()) {

    $guardians = [];

    if (!empty($row['guardians_json'])) {

        $decoded = json_decode(
            $row['guardians_json'],
            true
        );

        if (is_array($decoded)) {
            $guardians = $decoded;
        }
    }

    /*
     * Parent involvement is derived from the existing
     * Family & Parents information.
     */

    $parentInvolvement = '—';

    if (
        $row['willing_to_volunteer'] !== null &&
        (bool) $row['willing_to_volunteer']
    ) {
        $parentInvolvement = 'Volunteer';
    }

    if (
        empty($guardians) &&
        $parentInvolvement === '—'
    ) {
        $parentInvolvement = 'Not available';
    }

    $roster[] = [

        'pupil_id' => (int) $row['pupil_id'],

        'child_name' => $row['pupil_name'],

        'register_no' => $row['register_no'],

        /*
         * We deliberately return the existing guardians
         * structure instead of guessing its fields.
         */
        'guardians' => $guardians,

        'parent_involvement' => $parentInvolvement,

        'workshop_skills' => (
            json_decode(
                $row['workshop_skills'] ?? '',
                true
            ) ?: []
        ),

        'workshop_availability' => (
            json_decode(
                $row['workshop_availability'] ?? '',
                true
            ) ?: []
        ),

        'teacher_approved' => (
            (bool) $row['teacher_approved']
        ),

        'updated_at' => $row['updated_at']
            ? substr($row['updated_at'], 0, 10)
            : null
    ];
}

$stmt->close();

$conn->close();

/*
|--------------------------------------------------------------------------
| Response
|--------------------------------------------------------------------------
*/

echo json_encode(
    [
        'status' => 'success',
        'roster' => $roster
    ],
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES
);