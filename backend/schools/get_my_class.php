<?php
// =========================================================================
// GET MY CLASS — returns the logged-in teacher's own class (school_id,
// class_id, class name). Needed so the teacher's dashboard can filter
// events, attendance, and anything else down to just her school/class
// instead of seeing everything in the database.
//
// A teacher can own more than one class (e.g. Jr KG + Sr KG) — this
// returns ALL classes linked to her account, not just one.
//
// WHO: the logged-in teacher (users/teacher_auth.php). Through ngrok,
// no login means "Please log in again" — never another teacher's class.
// On localhost, ?dev_role=teacher still uses test teacher 49.
// =========================================================================

session_start();
header('Content-Type: application/json');

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'teacher') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../users/teacher_auth.php';
$conn = get_db_connection();

// Logged-in teacher only — never a guessed teacher (see users/teacher_auth.php).
$teacherId = current_teacher_id();

$stmt = $conn->prepare("
    SELECT c.id AS class_id, c.name AS class_name, c.school_id, s.name AS school_name
    FROM classes c
    JOIN schools s ON s.id = c.school_id
    WHERE c.teacher_user_id = ?
    ORDER BY c.id
");
$stmt->bind_param('i', $teacherId);
$stmt->execute();
$result = $stmt->get_result();

$classes = [];
while ($row = $result->fetch_assoc()) {
    $classes[] = $row;
}

$stmt->close();

// Which class she is working in (class switch; her first class until she chooses).
require_once __DIR__ . '/../users/teacher_class.php';
$active = teacher_active_class($conn, $teacherId);
$conn->close();

echo json_encode(['status' => 'success', 'classes' => $classes, 'active_class_id' => $active ? (int) $active['id'] : null]);
?>