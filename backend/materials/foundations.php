<?php
// backend/materials/foundations.php
// Lists the supply sources for the teacher's class (BMC, Bhavyata Foundation, Other Foundation,
// plus any other foundation the teacher adds) and saves a new foundation name.
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
    echo json_encode(['status' => 'success', 'foundations' => []]);
    $conn->close();
    exit;
}
$classId = (int) $classRow['id'];

// Table is created the first time it is needed (same approach as the other auto-created tables).
$conn->query("CREATE TABLE IF NOT EXISTS material_foundations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_class_name (class_id, name)
)");

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $name = trim((string) ($body['name'] ?? ''));
    $name = preg_replace('/\s+/', ' ', $name);
    if ($name === '' || mb_strlen($name) > 100) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Type the foundation name (up to 100 characters).']);
        $conn->close();
        exit;
    }
    $builtIn = ['bmc', 'bhavyata foundation', 'other foundation'];
    if (in_array(mb_strtolower($name), $builtIn, true)) {
        echo json_encode(['status' => 'error', 'message' => 'That foundation is already in the list.']);
        $conn->close();
        exit;
    }
    $stmt = $conn->prepare('INSERT IGNORE INTO material_foundations (class_id, name) VALUES (?, ?)');
    $stmt->bind_param('is', $classId, $name);
    $stmt->execute();
    $stmt->close();
}

$stmt = $conn->prepare('SELECT name FROM material_foundations WHERE class_id = ? ORDER BY name');
$stmt->bind_param('i', $classId);
$stmt->execute();
$result = $stmt->get_result();
$names = [];
while ($row = $result->fetch_assoc()) {
    $names[] = $row['name'];
}
$stmt->close();

echo json_encode(['status' => 'success', 'foundations' => $names]);
$conn->close();
