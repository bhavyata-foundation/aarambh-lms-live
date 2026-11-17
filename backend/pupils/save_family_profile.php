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

$locality = $input['locality'] ?? '';
$motherTongue = $input['mother_tongue'] ?? '';
$languages = json_encode($input['languages_at_home'] ?? [], JSON_UNESCAPED_UNICODE);
$income = $input['income_band'] ?? '';
$skills = json_encode($input['household_skills'] ?? [], JSON_UNESCAPED_UNICODE);
$resources = json_encode($input['home_resources'] ?? [], JSON_UNESCAPED_UNICODE);
$siblings = filter_var($input['siblings_in_programme'] ?? 0, FILTER_VALIDATE_INT) ?: 0;
$reads = !empty($input['adult_reads_programme_language']) ? 1 : 0;
$photoConsent = !empty($input['photo_consent']) ? 1 : 0;
$consent = !empty($input['consent']) ? 1 : 0;
$guardians = json_encode($input['guardians'] ?? [], JSON_UNESCAPED_UNICODE);
$workshopSkills = json_encode($input['workshop_skills'] ?? [], JSON_UNESCAPED_UNICODE);
$workshopAvailability = json_encode($input['workshop_availability'] ?? [], JSON_UNESCAPED_UNICODE);
$willing = array_key_exists('willing_to_volunteer', $input) && $input['willing_to_volunteer'] !== null
    ? ($input['willing_to_volunteer'] ? 1 : 0) : null;
$scheduledWorkshop = json_encode($input['scheduled_workshop'] ?? null, JSON_UNESCAPED_UNICODE);
$teacherApproved = !empty($input['teacher_approved']) ? 1 : 0;

$stmt = $conn->prepare(
    "INSERT INTO family_profiles
        (pupil_id, locality, mother_tongue, languages_at_home, income_band, household_skills, home_resources,
         siblings_in_programme, adult_reads_programme_language, photo_consent, consent, guardians_json,
         workshop_skills, workshop_availability, willing_to_volunteer, scheduled_workshop, teacher_approved, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
        locality=VALUES(locality), mother_tongue=VALUES(mother_tongue), languages_at_home=VALUES(languages_at_home),
        income_band=VALUES(income_band), household_skills=VALUES(household_skills), home_resources=VALUES(home_resources),
        siblings_in_programme=VALUES(siblings_in_programme), adult_reads_programme_language=VALUES(adult_reads_programme_language),
        photo_consent=VALUES(photo_consent), consent=VALUES(consent), guardians_json=VALUES(guardians_json),
        workshop_skills=VALUES(workshop_skills), workshop_availability=VALUES(workshop_availability),
        willing_to_volunteer=VALUES(willing_to_volunteer), scheduled_workshop=VALUES(scheduled_workshop),
        teacher_approved=VALUES(teacher_approved), updated_by=VALUES(updated_by)"
);
$stmt->bind_param(
    'issssssiiiisssiisi',
    $pupilId, $locality, $motherTongue, $languages, $income, $skills, $resources,
    $siblings, $reads, $photoConsent, $consent, $guardians,
    $workshopSkills, $workshopAvailability, $willing, $scheduledWorkshop, $teacherApproved, $teacherId
);
$stmt->execute();
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'message' => 'Saved.'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);