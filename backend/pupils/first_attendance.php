<?php
// backend/pupils/first_attendance.php
// For each child in the teacher's class: the first day their attendance was marked.
// That day is treated as the child's admission day. Children with no attendance marked get no entry
// (the screen then keeps the admission date on the roll).
header('Content-Type: application/json');

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1'], true);
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
$teacherId = current_teacher_id();

require_once __DIR__ . '/../users/teacher_class.php';
$classRow = teacher_active_class($conn, (int) $teacherId);
if (!$classRow) {
    echo json_encode(['status' => 'success', 'first' => new stdClass()]);
    $conn->close();
    exit;
}

$stmt = $conn->prepare("
    SELECT p.id AS pupil_id, MIN(d.date) AS first_date
    FROM pupils p
    LEFT JOIN daily_attendance d ON d.pupil_id = p.id AND d.status IN ('present', 'absent')
    WHERE p.class_id = ?
    GROUP BY p.id
");
$stmt->bind_param('i', $classRow['id']);
$stmt->execute();
$result = $stmt->get_result();

$first = [];
while ($row = $result->fetch_assoc()) {
    if (!empty($row['first_date'])) {
        $first[(string) $row['pupil_id']] = substr($row['first_date'], 0, 10);
    }
}
$stmt->close();

echo json_encode(['status' => 'success', 'first' => $first ?: new stdClass()]);
$conn->close();
