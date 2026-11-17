<?php
// =========================================================================
// SAVE CLASS RECORD — saves (or, with data:null, removes) one record.
//   POST { class_id, kind, key, data }
//   Several at once (used for the one-time move from the browser):
//   POST { class_id, kind, records: { key: data, ... } }
// =========================================================================
require_once __DIR__ . '/records_common.php';
records_role_check();

$teacherId = current_teacher_id();
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) records_fail(400, 'Send the record as JSON.');

$conn = get_db_connection();
$classId = records_own_class($conn, $teacherId, $input['class_id'] ?? null);
$kind = records_kind($input['kind'] ?? '');

$items = [];
if (isset($input['records']) && is_array($input['records'])) {
    $items = $input['records'];
} elseif (array_key_exists('key', $input)) {
    $items = [(string) $input['key'] => $input['data'] ?? null];
}
if (!$items) records_fail(400, 'Nothing to save.');
if (count($items) > 200) records_fail(400, 'Too many records in one request.');

$upsert = $conn->prepare(
    'INSERT INTO class_records (class_id, kind, record_key, data, updated_by) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE data = VALUES(data), updated_by = VALUES(updated_by)'
);
$delete = $conn->prepare('DELETE FROM class_records WHERE class_id = ? AND kind = ? AND record_key = ?');

$saved = 0; $removed = 0; $skipped = [];
$conn->begin_transaction();
foreach ($items as $key => $data) {
    $key = trim((string) $key);
    if ($key === '' || strlen($key) > 60 || !preg_match('/^[A-Za-z0-9_\-:.]+$/', $key)) { $skipped[] = $key; continue; }
    if ($data === null) {
        $delete->bind_param('iss', $classId, $kind, $key);
        $delete->execute();
        $removed += $delete->affected_rows > 0 ? 1 : 0;
        continue;
    }
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false || strlen($json) > CLASS_RECORD_MAX_BYTES) { $skipped[] = $key; continue; }
    $upsert->bind_param('isssi', $classId, $kind, $key, $json, $teacherId);
    $upsert->execute();
    $saved++;
}
$conn->commit();
$upsert->close(); $delete->close(); $conn->close();

echo json_encode(['status' => 'success', 'saved' => $saved, 'removed' => $removed, 'skipped' => $skipped]);
