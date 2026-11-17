<?php
// ============================================================
// GET ALL SESSION EVIDENCE — every activity photo label for the
// teacher's class, all weeks, in the same shape the screen uses:
//   { evidence: { 'WEEK-DAY-DOMAIN': [ {id, name, size, type,
//                 driveFileId, driveLink, uploadedAt}, ... ] } }
// File: backend/daily_plan/get_all_session_evidence.php
// ============================================================
session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');
set_exception_handler(function ($e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error.']);
    exit;
});

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../users/teacher_auth.php';

$devRole = (teacher_auth_is_local() && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
if (($_SESSION['role'] ?? $devRole) !== 'teacher') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}
$teacherId = current_teacher_id();

$classId = filter_var($_GET['class_id'] ?? null, FILTER_VALIDATE_INT);
if (!$classId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'class_id is required.']);
    exit;
}

$conn = get_db_connection();
$stmt = $conn->prepare('SELECT id FROM classes WHERE id = ? AND teacher_user_id = ? LIMIT 1');
$stmt->bind_param('ii', $classId, $teacherId);
$stmt->execute();
$own = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$own) {
    $conn->close();
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'This class does not belong to the logged-in teacher.']);
    exit;
}

$stmt = $conn->prepare(
    'SELECT se.id, w.week_number, se.day, se.domain_key, se.file_name, se.file_size, se.file_type,
            se.drive_file_id, se.drive_link, se.uploaded_at
     FROM session_evidence se
     JOIN weeks w ON w.id = se.week_id
     WHERE se.class_id = ?
     ORDER BY se.uploaded_at ASC, se.id ASC'
);
$stmt->bind_param('i', $classId);
$stmt->execute();
$result = $stmt->get_result();
$evidence = [];
while ($row = $result->fetch_assoc()) {
    $key = $row['week_number'] . '-' . $row['day'] . '-' . $row['domain_key'];
    if (!isset($evidence[$key])) $evidence[$key] = [];
    $evidence[$key][] = [
        'id'          => (int) $row['id'],
        'name'        => $row['file_name'],
        'size'        => (int) $row['file_size'],
        'type'        => $row['file_type'],
        'driveFileId' => $row['drive_file_id'],
        'driveLink'   => $row['drive_link'],
        'uploadedAt'  => substr((string) $row['uploaded_at'], 0, 10),
    ];
}
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'evidence' => $evidence ?: new stdClass()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
