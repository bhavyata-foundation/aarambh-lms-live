<?php
session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

set_exception_handler(function ($e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error.']);
    exit;
});

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'teacher') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}

$teacherId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : ($devRole ? 49 : null);
if (!$teacherId) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Could not determine teacher.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$pupilId = filter_var($input['pupil_id'] ?? null, FILTER_VALIDATE_INT);
if (!$pupilId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'pupil_id is required.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

// Verify this pupil belongs to a class this teacher owns.
$stmt = $conn->prepare(
    "SELECT p.id FROM pupils p
     JOIN classes c ON c.id = p.class_id
     WHERE p.id = ? AND c.teacher_user_id = ?"
);
$stmt->bind_param('ii', $pupilId, $teacherId);
$stmt->execute();
$pupil = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$pupil) {
    $conn->close();
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'This pupil does not belong to the logged-in teacher.']);
    exit;
}


$gender = trim((string) ($input['gender'] ?? ''));
if (!in_array($gender, ['Female', 'Male', 'Other'], true)) {
    $conn->close();
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Choose Female, Male or Other.']);
    exit;
}
$upd = $conn->prepare("UPDATE pupils SET gender = ? WHERE id = ?");
$upd->bind_param('si', $gender, $pupilId);
$upd->execute();
$upd->close();
$conn->close();
echo json_encode(['status' => 'success', 'gender' => $gender]);
