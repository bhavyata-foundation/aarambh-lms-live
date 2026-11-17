<?php
set_exception_handler(function($e){
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
});
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

// =========================================================================
// SAVE PTM MEETING — "someone deciding the event." Originally
// supervisor/superadmin only, matching PTM-02 in the BRD ("the date is
// set by the supervisor... cannot be moved by the teacher alone").
// That's been explicitly reversed for this build: BOTH the teacher and
// the supervisor/superadmin can now schedule one. Since the read side
// only ever shows one active upcoming PTM per class at a time, this
// doesn't create a double-booking risk — whoever gets there first
// schedules it, and everyone else just sees it already exists. Who
// actually did it is preserved via created_by, unchanged from before.
// =========================================================================

session_start();
header('Content-Type: application/json');

$isLocalRequest = in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1', 'localhost:80', '127.0.0.1:80']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if (!in_array($effectiveRole, ['teacher', 'supervisor', 'superadmin'], true)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Only a teacher, supervisor, or superadmin can schedule a PTM.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) { $input = []; }

$schoolId      = $input['school_id'] ?? null;
$classId       = $input['class_id'] ?? null;
$meetingDate   = trim($input['meeting_date'] ?? '');
$meetingTime   = trim($input['meeting_time'] ?? '2:30 PM');
$venue         = trim($input['venue'] ?? 'Classroom');
$invitedCount  = (int) ($input['invited_count'] ?? 0);
$objectives    = is_array($input['objectives'] ?? null) ? $input['objectives'] : [];
$teacherPrep   = is_array($input['teacher_prep'] ?? null) ? $input['teacher_prep'] : [];
$supervisorPrep = is_array($input['supervisor_prep'] ?? null) ? $input['supervisor_prep'] : [];

if (!$schoolId || $meetingDate === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'school_id and meeting_date are both required.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

// Dev-mode fallback (no real login session): attribute to a real
// account matching whichever role is actually asking. For 'teacher'
// this is hardcoded to teacher 49 — same fix already applied to
// get_my_class.php, get_materials.php, and import_materials.php,
// since "any teacher, ordered by id" doesn't check whether that
// teacher actually has a class linked and picks the wrong one.
if (isset($_SESSION['user_id'])) {
    $effectiveUserId = $_SESSION['user_id'];
} elseif ($effectiveRole === 'teacher') {
    // The logged-in teacher only — never a guessed teacher (users/teacher_auth.php).
    require_once __DIR__ . '/../users/teacher_auth.php';
    $effectiveUserId = current_teacher_id();
} else {
    $lookup = $conn->query("SELECT id FROM users WHERE role IN ('supervisor','superadmin') ORDER BY id LIMIT 1");
    $row = $lookup ? $lookup->fetch_assoc() : null;
    if (!$row) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'No supervisor or superadmin account exists yet to attribute this to.']);
        exit;
    }
    $effectiveUserId = $row['id'];
}

$stmt = $conn->prepare("
    INSERT INTO ptm_meetings (school_id, class_id, meeting_date, meeting_time, venue, invited_count, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
");
$stmt->bind_param('iisssii', $schoolId, $classId, $meetingDate, $meetingTime, $venue, $invitedCount, $effectiveUserId);
if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not create the meeting: ' . $stmt->error]);
    $stmt->close();
    $conn->close();
    exit;
}
$meetingId = $conn->insert_id;
$stmt->close();

$objStmt = $conn->prepare("INSERT INTO ptm_objectives (ptm_meeting_id, objective_text, sort_order) VALUES (?, ?, ?)");
foreach ($objectives as $i => $text) {
    $text = trim((string) $text);
    if ($text === '') { continue; }
    $objStmt->bind_param('isi', $meetingId, $text, $i);
    $objStmt->execute();
}
$objStmt->close();

$prepStmt = $conn->prepare("INSERT INTO ptm_prep_items (ptm_meeting_id, for_role, item_text, sort_order) VALUES (?, ?, ?, ?)");
$teacherRole = 'teacher';
foreach ($teacherPrep as $i => $text) {
    $text = trim((string) $text);
    if ($text === '') { continue; }
    $prepStmt->bind_param('issi', $meetingId, $teacherRole, $text, $i);
    $prepStmt->execute();
}
$supervisorRole = 'supervisor';
foreach ($supervisorPrep as $i => $text) {
    $text = trim((string) $text);
    if ($text === '') { continue; }
    $prepStmt->bind_param('issi', $meetingId, $supervisorRole, $text, $i);
    $prepStmt->execute();
}
$prepStmt->close();

$conn->close();
echo json_encode(['status' => 'success', 'meeting_id' => $meetingId]);
?>