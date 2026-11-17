<?php
// ============================================================
// GET STUDENT HOLIDAYS
//   GET ?class_id=47               → the class's holidays
//   GET ?class_id=47&pupil_id=812  → the class's holidays, plus any
//                                    holiday for that one child
// → { status:'success', holidays: { 'YYYY-MM-DD': 'Name', ... } }
// File: backend/daily_plan/get_student_holidays.php
// ============================================================
require_once __DIR__ . '/holidays_common.php';
$teacherId = holidays_teacher();
$conn = get_db_connection();
$classId = holidays_own_class($conn, $teacherId, $_GET['class_id'] ?? null);
$pupilId = holidays_pupil($conn, $classId, $_GET['pupil_id'] ?? null);

if ($pupilId === null) {
    $stmt = $conn->prepare('SELECT holiday_date, holiday_name FROM student_holidays
                            WHERE class_id = ? AND pupil_id IS NULL ORDER BY holiday_date');
    $stmt->bind_param('i', $classId);
} else {
    // Whole-class first, then the child's own (which wins on the same day).
    $stmt = $conn->prepare('SELECT holiday_date, holiday_name FROM student_holidays
                            WHERE class_id = ? AND (pupil_id IS NULL OR pupil_id = ?)
                            ORDER BY holiday_date, (pupil_id IS NOT NULL)');
    $stmt->bind_param('ii', $classId, $pupilId);
}
$stmt->execute();
$result = $stmt->get_result();
$holidays = [];
while ($row = $result->fetch_assoc()) $holidays[$row['holiday_date']] = $row['holiday_name'];
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'holidays' => $holidays ?: new stdClass()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
