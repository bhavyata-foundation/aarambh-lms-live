<?php
// =========================================================================
// SELECT CLASS — the class switch in the top bar (teachers with two
// sections). POST { class_id }. Only one of the logged-in teacher's own
// classes can be chosen; the choice is kept in her session and used by
// every page until she switches again or logs out.
// =========================================================================
session_start();
header('Content-Type: application/json; charset=utf-8');

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocal = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocal && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
if (($_SESSION['role'] ?? $devRole) !== 'teacher') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../users/teacher_auth.php';
require_once __DIR__ . '/../users/teacher_class.php';

$teacherId = current_teacher_id();
$input = json_decode(file_get_contents('php://input'), true);
$classId = filter_var($input['class_id'] ?? null, FILTER_VALIDATE_INT);
if (!$classId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'class_id is required.']);
    exit;
}

$conn = get_db_connection();
$mine = array_map(fn($c) => (int) $c['id'], teacher_classes($conn, $teacherId));
$conn->close();

if (!in_array($classId, $mine, true)) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'This class is not linked to your login.']);
    exit;
}

$_SESSION['active_class_id'] = $classId;
echo json_encode(['status' => 'success', 'class_id' => $classId]);
