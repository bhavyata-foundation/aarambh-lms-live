<?php
// =========================================================================
// GET TEACHERS (SUPERVISOR VIEW)
// -------------------------------------------------------------------------
// Every real teacher account, joined to her actual assigned class and
// school — replaces the hardcoded TEACHERS demo array in checklist.js.
// This is what makes "select a teacher in the sidebar, auto-fill her
// school into the Schedule Visit form" possible with real data instead
// of a placeholder list.
//
// File: backend/schools/get_teachers_for_supervisor.php
// =========================================================================

session_start();
header('Content-Type: application/json');

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'supervisor') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

// LEFT JOIN, not INNER — a teacher account not yet linked to a class
// still shows up (with class/school as null), rather than silently
// disappearing from the list, which would be a confusing way to find
// out an account isn't linked yet.
$sql = "
    SELECT
        u.id AS teacher_id,
        u.name AS teacher_name,
        c.id AS class_id,
        c.name AS class_name,
        s.id AS school_id,
        s.name AS school_name,
        s.ward AS ward
    FROM users u
    LEFT JOIN classes c ON c.teacher_user_id = u.id
    LEFT JOIN schools s ON s.id = c.school_id
    WHERE u.role = 'teacher'
    ORDER BY u.name
";

$result = $conn->query($sql);

$teachers = [];
while ($row = $result->fetch_assoc()) {
    $teachers[] = [
        'id' => (int)$row['teacher_id'],
        'name' => $row['teacher_name'],
        'class_id' => $row['class_id'] !== null ? (int)$row['class_id'] : null,
        'class_name' => $row['class_name'],
        'school_id' => $row['school_id'] !== null ? (int)$row['school_id'] : null,
        'school_name' => $row['school_name'],
        'ward' => $row['ward'],
    ];
}

$conn->close();

echo json_encode(['status' => 'success', 'teachers' => $teachers]);
?>