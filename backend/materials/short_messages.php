<?php
// backend/materials/short_messages.php
// Teacher sends a message about short materials to the supervisor of her school.
// Teacher: sends (POST) and sees her own messages (GET).
// Supervisor: sees messages from teachers in the schools they cover, and can mark them read.
// Superadmin: sees every message.
header('Content-Type: application/json');

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1'], true);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$role = $_SESSION['role'] ?? $devRole;
$userId = (int) ($_SESSION['user_id'] ?? 0);

if (!in_array($role, ['teacher', 'supervisor', 'superadmin'], true) || $userId === 0) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../users/teacher_auth.php';
require_once __DIR__ . '/../users/teacher_class.php';
$conn = get_db_connection();

$conn->query("CREATE TABLE IF NOT EXISTS material_short_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    school_id INT NOT NULL,
    teacher_user_id INT NOT NULL,
    supervisor_user_id INT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    INDEX idx_supervisor (supervisor_user_id),
    INDEX idx_teacher (teacher_user_id)
)");

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// ---- Teacher sends a message ----
if ($method === 'POST' && $role === 'teacher') {
    $body = json_decode(file_get_contents('php://input'), true);
    $message = trim((string) ($body['message'] ?? ''));
    if ($message === '' || mb_strlen($message) > 2000) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Type the message (up to 2000 characters).']);
        $conn->close(); exit;
    }
    $classRow = teacher_active_class($conn, $userId);
    if (!$classRow) {
        echo json_encode(['status' => 'error', 'message' => 'No class is set up for you yet.']);
        $conn->close(); exit;
    }
    $schoolId = (int) $classRow['school_id'];
    $stmt = $conn->prepare('SELECT supervisor_user_id FROM supervisor_schools WHERE school_id = ? LIMIT 1');
    $stmt->bind_param('i', $schoolId);
    $stmt->execute();
    $sup = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$sup) {
        echo json_encode(['status' => 'error', 'message' => 'No supervisor is assigned to your school yet, so the message cannot be sent.']);
        $conn->close(); exit;
    }
    $supervisorId = (int) $sup['supervisor_user_id'];
    $classId = (int) $classRow['id'];
    $stmt = $conn->prepare('INSERT INTO material_short_messages (class_id, school_id, teacher_user_id, supervisor_user_id, message) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('iiiis', $classId, $schoolId, $userId, $supervisorId, $message);
    $stmt->execute();
    $stmt->close();
    echo json_encode(['status' => 'success']);
    $conn->close(); exit;
}

// ---- Supervisor marks a message as read ----
if ($method === 'POST' && in_array($role, ['supervisor', 'superadmin'], true)) {
    $body = json_decode(file_get_contents('php://input'), true);
    $id = (int) ($body['id'] ?? 0);
    if ($id > 0) {
        if ($role === 'superadmin') {
            $stmt = $conn->prepare('UPDATE material_short_messages SET read_at = NOW() WHERE id = ? AND read_at IS NULL');
            $stmt->bind_param('i', $id);
        } else {
            $stmt = $conn->prepare('UPDATE material_short_messages SET read_at = NOW() WHERE id = ? AND supervisor_user_id = ? AND read_at IS NULL');
            $stmt->bind_param('ii', $id, $userId);
        }
        $stmt->execute();
        $stmt->close();
    }
    echo json_encode(['status' => 'success']);
    $conn->close(); exit;
}

// ---- Lists ----
$sql = "SELECT m.id, m.message, m.created_at, m.read_at, m.class_id, m.school_id,
               m.teacher_user_id, m.supervisor_user_id,
               t.name AS teacher_name, c.name AS class_name
        FROM material_short_messages m
        LEFT JOIN users t ON t.id = m.teacher_user_id
        LEFT JOIN classes c ON c.id = m.class_id";
if ($role === 'teacher') {
    $stmt = $conn->prepare($sql . ' WHERE m.teacher_user_id = ? ORDER BY m.created_at DESC LIMIT 200');
    $stmt->bind_param('i', $userId);
} elseif ($role === 'supervisor') {
    $stmt = $conn->prepare($sql . ' WHERE m.supervisor_user_id = ? ORDER BY m.created_at DESC LIMIT 200');
    $stmt->bind_param('i', $userId);
} else {
    $stmt = $conn->prepare($sql . ' ORDER BY m.created_at DESC LIMIT 200');
}
$stmt->execute();
$result = $stmt->get_result();
$messages = [];
while ($row = $result->fetch_assoc()) { $messages[] = $row; }
$stmt->close();

echo json_encode(['status' => 'success', 'messages' => $messages]);
$conn->close();
