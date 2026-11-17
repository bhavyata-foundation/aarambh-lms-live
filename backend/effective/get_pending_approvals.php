<?php
// =========================================================================
// GET PENDING APPROVALS — Supervisor-side. Lists every effective_approvals
// row still 'pending', joined with the teacher's name and the class/
// school names, so the Supervisor screen has something readable to
// show, not just raw IDs.
//
// KNOWN LIMITATION: this does not filter by "schools assigned to this
// supervisor" — that assignment table's schema isn't known yet, so
// every pending submission system-wide is returned. Add a WHERE
// clause here once that table exists (e.g. WHERE s.id IN (SELECT
// school_id FROM supervisor_schools WHERE supervisor_user_id = ?)).
//
// Same mysqli connection pattern as get_my_class.php.
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

$result = $conn->query(
    "SELECT ea.id, ea.school_id, ea.class_id, ea.teacher_user_id, ea.year, ea.month,
            ea.teacher_attendance_pct, ea.submitted_at,
            u.name AS teacher_name, c.name AS class_name, s.name AS school_name
     FROM effective_approvals ea
     JOIN users u ON u.id = ea.teacher_user_id
     JOIN classes c ON c.id = ea.class_id
     JOIN schools s ON s.id = ea.school_id
     WHERE ea.status = 'pending'
     ORDER BY ea.submitted_at ASC"
);

$rows = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row['teacher_attendance_pct'] = (float)$row['teacher_attendance_pct'];
        $rows[] = $row;
    }
}

$conn->close();

echo json_encode(['status' => 'success', 'pending' => $rows]);
?>