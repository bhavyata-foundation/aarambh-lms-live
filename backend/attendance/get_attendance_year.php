<?php
// =========================================================================
// GET ATTENDANCE — WHOLE ACADEMIC YEAR (one call instead of one per month)
//
// GET ?class_id=N&start_year=2026      (academic year = Jun 2026 .. Apr 2027)
//
// Response:
// {
//   "status": "success",
//   "start_year": 2026,
//   "marked_days": { "2026-08": 19, ... },          // distinct weekdays with >=1 mark
//   "children": { "<pupil_id>": { "2026-08": [present, marked], ... } }
// }
// Weekdays only (Mon-Fri), same as the rest of the app. Working days
// (holidays) are worked out in the browser, so they are not returned here.
// =========================================================================

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

$classId = filter_var($_GET['class_id'] ?? null, FILTER_VALIDATE_INT);
$startYear = filter_var($_GET['start_year'] ?? null, FILTER_VALIDATE_INT);
if (!$classId || !$startYear || $startYear < 2000 || $startYear > 2100) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid fields.']);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../pupils/pupil_helpers.php';

$conn = get_db_connection();
$authorizedClass = pupil_authorized_class($conn, $classId);
$classId = $authorizedClass['id'];

$from = sprintf('%04d-06-01', $startYear);
$to   = sprintf('%04d-04-30', $startYear + 1);

// Per child, per month: present count and marked count.
$stmt = $conn->prepare(
    "SELECT a.pupil_id,
            DATE_FORMAT(a.date, '%Y-%m') AS ym,
            SUM(a.status = 'present')    AS present,
            COUNT(*)                     AS marked
       FROM daily_attendance a
       JOIN pupils p ON p.id = a.pupil_id
      WHERE p.class_id = ?
        AND a.date BETWEEN ? AND ?
        AND WEEKDAY(a.date) <= 4
      GROUP BY a.pupil_id, ym"
);
$stmt->bind_param('iss', $classId, $from, $to);
$stmt->execute();
$children = [];
$res = $stmt->get_result();
while ($r = $res->fetch_assoc()) {
    $children[(string) $r['pupil_id']][$r['ym']] = [(int) $r['present'], (int) $r['marked']];
}
$stmt->close();

// Per month: how many different days had at least one mark.
$stmt = $conn->prepare(
    "SELECT DATE_FORMAT(a.date, '%Y-%m') AS ym, COUNT(DISTINCT a.date) AS days
       FROM daily_attendance a
       JOIN pupils p ON p.id = a.pupil_id
      WHERE p.class_id = ?
        AND a.date BETWEEN ? AND ?
        AND WEEKDAY(a.date) <= 4
      GROUP BY ym"
);
$stmt->bind_param('iss', $classId, $from, $to);
$stmt->execute();
$markedDays = [];
$res = $stmt->get_result();
while ($r = $res->fetch_assoc()) {
    $markedDays[$r['ym']] = (int) $r['days'];
}
$stmt->close();
$conn->close();

echo json_encode([
    'status'      => 'success',
    'start_year'  => $startYear,
    'marked_days' => (object) $markedDays,
    'children'    => (object) $children,
]);