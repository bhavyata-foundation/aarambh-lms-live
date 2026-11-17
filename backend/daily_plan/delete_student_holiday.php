<?php
// ============================================================
// DELETE STUDENT HOLIDAY
//   POST { class_id, holiday_date }            → removes the class's holiday that day
//   POST { class_id, pupil_id, holiday_date }  → removes that child's holiday that day
// File: backend/daily_plan/delete_student_holiday.php
// ============================================================
require_once __DIR__ . '/holidays_common.php';
$teacherId = holidays_teacher();
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) holidays_fail(400, 'Send the holiday as JSON.');

$conn = get_db_connection();
$classId = holidays_own_class($conn, $teacherId, $input['class_id'] ?? null);
$pupilId = holidays_pupil($conn, $classId, $input['pupil_id'] ?? null);
$date = holidays_valid_date($input['holiday_date'] ?? '');

$stmt = $conn->prepare('DELETE FROM student_holidays WHERE class_id = ? AND holiday_date = ? AND pupil_id <=> ?');
$stmt->bind_param('isi', $classId, $date, $pupilId);
$stmt->execute();
$removed = $stmt->affected_rows;
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'removed' => $removed]);
