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

$classId = filter_var($_GET['class_id'] ?? null, FILTER_VALIDATE_INT);
if (!$classId) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'class_id is required.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$stmt = $conn->prepare("SELECT id FROM classes WHERE id = ? AND teacher_user_id = ? LIMIT 1");
$stmt->bind_param('ii', $classId, $teacherId);
$stmt->execute();
$class = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$class) {
    $conn->close();
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'This class does not belong to the logged-in teacher.']);
    exit;
}

$stmt = $conn->prepare(
    "SELECT p.id AS pupil_id, p.name AS pupil_name, f.*
     FROM pupils p
     JOIN family_profiles f ON f.pupil_id = p.id
     WHERE p.class_id = ?"
);
$stmt->bind_param('i', $classId);
$stmt->execute();
$result = $stmt->get_result();

$profiles = [];
while ($row = $result->fetch_assoc()) {
    $profiles[$row['pupil_name']] = [
        'pupil_id' => (int) $row['pupil_id'],
        'locality' => $row['locality'],
        'motherTongue' => $row['mother_tongue'],
        'langs' => json_decode($row['languages_at_home'], true) ?: [],
        'income' => $row['income_band'],
        'skills' => json_decode($row['household_skills'], true) ?: [],
        'res' => json_decode($row['home_resources'], true) ?: [],
        'siblings' => (int) $row['siblings_in_programme'],
        'reads' => (bool) $row['adult_reads_programme_language'],
        'photoConsent' => (bool) $row['photo_consent'],
        'consent' => (bool) $row['consent'],
        'guardians' => json_decode($row['guardians_json'], true) ?: [],
        'workshopSkills' => json_decode($row['workshop_skills'], true) ?: [],
        'workshopAvailability' => json_decode($row['workshop_availability'], true) ?: [],
        'willingToVolunteer' => $row['willing_to_volunteer'] === null ? null : (bool) $row['willing_to_volunteer'],
        'scheduledWorkshop' => json_decode($row['scheduled_workshop'], true),
        'teacherApproved' => (bool) $row['teacher_approved'],
        'importedAt' => substr($row['updated_at'], 0, 10)
    ];
}
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'profiles' => $profiles], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);