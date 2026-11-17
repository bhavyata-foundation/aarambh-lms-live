<?php
// ============================================================
// SAVE STUDENT HOLIDAY
//   POST { class_id, holiday_date, holiday_name }            → whole class
//   POST { class_id, pupil_id, holiday_date, holiday_name }  → one child
// Saving the same day again just renames it (never a second row).
// File: backend/daily_plan/save_student_holiday.php
// ============================================================
require_once __DIR__ . '/holidays_common.php';
$teacherId = holidays_teacher();
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) holidays_fail(400, 'Send the holiday as JSON.');

$conn = get_db_connection();
$classId = holidays_own_class($conn, $teacherId, $input['class_id'] ?? null);
$pupilId = holidays_pupil($conn, $classId, $input['pupil_id'] ?? null);
$date = holidays_valid_date($input['holiday_date'] ?? '');
$name = trim((string) ($input['holiday_name'] ?? ''));
if ($name === '') holidays_fail(400, 'holiday_name is required.');
// Keep names to 120 characters (Marathi/Hindi letters count as one each).
if (function_exists('mb_substr')) $name = mb_substr($name, 0, 120, 'UTF-8');
elseif (preg_match('/^.{0,120}/us', $name, $m)) $name = $m[0];

$find = $conn->prepare('SELECT id FROM student_holidays WHERE class_id = ? AND holiday_date = ? AND pupil_id <=> ? LIMIT 1');
$find->bind_param('isi', $classId, $date, $pupilId);
$find->execute();
$existing = $find->get_result()->fetch_assoc();
$find->close();

if ($existing) {
    $stmt = $conn->prepare('UPDATE student_holidays SET holiday_name = ?, declared_by = ? WHERE id = ?');
    $id = (int) $existing['id'];
    $stmt->bind_param('sii', $name, $teacherId, $id);
} else {
    $stmt = $conn->prepare('INSERT INTO student_holidays (class_id, pupil_id, holiday_date, holiday_name, declared_by) VALUES (?, ?, ?, ?, ?)');
    $stmt->bind_param('iissi', $classId, $pupilId, $date, $name, $teacherId);
}
$stmt->execute();
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'message' => $pupilId === null ? 'Holiday saved for the class.' : 'Holiday saved for this child.'], JSON_UNESCAPED_UNICODE);
