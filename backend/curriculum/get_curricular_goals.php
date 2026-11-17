<?php
// =========================================================================
// GET CURRICULAR GOALS — the real 13-CG taxonomy, for populating the
// Curricular Goal dropdown on the "add a competency" setup form. Shared
// reference data, not scoped to a teacher's class.
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
$conn = get_db_connection();

$result = $conn->query("SELECT cg.id, cg.goal_text, da.name AS area_name
                         FROM curricular_goals cg JOIN development_areas da ON da.id = cg.development_area_id
                         ORDER BY da.id, cg.id");
$goals = [];
while ($row = $result->fetch_assoc()) {
    $goals[] = ['id' => (int)$row['id'], 'goal_text' => $row['goal_text'], 'area_name' => $row['area_name']];
}
$conn->close();

echo json_encode(['status' => 'success', 'curricular_goals' => $goals]);