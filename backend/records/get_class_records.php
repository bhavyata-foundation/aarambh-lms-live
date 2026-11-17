<?php
// =========================================================================
// GET CLASS RECORDS — every record of one kind for the teacher's class.
//   GET ?class_id=47&kind=effective
//   → { status:'success', records: { '2026-6': {...}, '2026-7': {...} } }
// =========================================================================
require_once __DIR__ . '/records_common.php';
records_role_check();

$teacherId = current_teacher_id();
$conn = get_db_connection();
$classId = records_own_class($conn, $teacherId, $_GET['class_id'] ?? null);
$kind = records_kind($_GET['kind'] ?? '');

$stmt = $conn->prepare('SELECT record_key, data, updated_at FROM class_records WHERE class_id = ? AND kind = ?');
$stmt->bind_param('is', $classId, $kind);
$stmt->execute();
$result = $stmt->get_result();
$records = new stdClass();
while ($row = $result->fetch_assoc()) {
    $data = json_decode($row['data'], true);
    if ($data !== null) $records->{$row['record_key']} = $data;
}
$stmt->close();
$conn->close();

echo json_encode(['status' => 'success', 'records' => $records], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
