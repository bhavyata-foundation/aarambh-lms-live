<?php
// Save one or many attendance marks for one authorized class.  Every pupil
// ID is checked against that class before an upsert, so an imported workbook
// cannot attach marks to a pupil from another class.

session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../pupils/pupil_helpers.php';

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$marks = isset($input['marks']) && is_array($input['marks'])
    ? $input['marks']
    : [$input];

if (!$marks || count($marks) > 1000) {
    pupil_json_error(400, 'One request must contain between 1 and 1,000 attendance marks.');
}

try {
    $conn = get_db_connection();
    $requestedClassId = $input['class_id'] ?? null;

    // Backward compatibility for an older single-mark caller: obtain the
    // class from its pupil, then apply the same teacher authorization.
    if (!$requestedClassId) {
        $firstPupilId = filter_var($marks[0]['pupil_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$firstPupilId) pupil_json_error(400, 'class_id is required.');
        $lookup = $conn->prepare('SELECT class_id FROM pupils WHERE id = ? LIMIT 1');
        $lookup->bind_param('i', $firstPupilId);
        $lookup->execute();
        $row = $lookup->get_result()->fetch_assoc();
        $lookup->close();
        if (!$row) pupil_json_error(404, 'Pupil not found.');
        $requestedClassId = $row['class_id'];
    }

    $class = pupil_authorized_class($conn, $requestedClassId);
    $classId = $class['id'];

    $allowed = [];
    $stmt = $conn->prepare('SELECT id FROM pupils WHERE class_id = ? AND active = 1');
    $stmt->bind_param('i', $classId);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) $allowed[(int) $row['id']] = true;
    $stmt->close();

    $upsert = $conn->prepare(
        'INSERT INTO daily_attendance (pupil_id, date, status, marked_at) '
        . 'VALUES (?, ?, ?, NOW()) '
        . 'ON DUPLICATE KEY UPDATE status = VALUES(status), marked_at = NOW()'
    );
    $delete = $conn->prepare(
        'DELETE FROM daily_attendance WHERE pupil_id = ? AND date = ?'
    );

    $saved = 0;
    $skipped = [];
    $touchedPupils = [];
    $conn->begin_transaction();
    foreach ($marks as $index => $mark) {
        $pupilId = filter_var($mark['pupil_id'] ?? null, FILTER_VALIDATE_INT);
        $date = trim((string) ($mark['date'] ?? ''));
        $status = array_key_exists('status', $mark) ? $mark['status'] : null;
        $dateObject = DateTime::createFromFormat('!Y-m-d', $date);

        if (!$pupilId || !$dateObject || $dateObject->format('Y-m-d') !== $date) {
            $skipped[] = 'Mark ' . ($index + 1) . ': invalid pupil or date.';
            continue;
        }
        if (!isset($allowed[(int) $pupilId])) {
            $skipped[] = 'Mark ' . ($index + 1) . ': pupil is not active in this class.';
            continue;
        }
        if ($status !== null && !in_array($status, ['present', 'absent'], true)) {
            $skipped[] = 'Mark ' . ($index + 1) . ': invalid attendance status.';
            continue;
        }

        if ($status === null) {
            $delete->bind_param('is', $pupilId, $date);
            $delete->execute();
        } else {
            $upsert->bind_param('iss', $pupilId, $date, $status);
            $upsert->execute();
        }
        $touchedPupils[(int) $pupilId] = true;
        $saved++;
    }
    $conn->commit();
    $upsert->close();
    $delete->close();
    // the admission date follows the first P / A day recorded for each child
    require_once __DIR__ . '/../pupils/admission_sync.php';
    sync_admission_dates($conn, array_keys($touchedPupils));
    $conn->close();

    echo json_encode([
        'status' => 'success',
        'class_id' => $classId,
        'saved' => $saved,
        'skipped' => $skipped,
    ]);
} catch (Throwable $e) {
    if (isset($conn)) {
        try { $conn->rollback(); } catch (Throwable $ignored) {}
        try { $conn->close(); } catch (Throwable $ignored) {}
    }
    error_log('save_attendance failed: ' . $e->getMessage());
    pupil_json_error(500, 'Attendance could not be saved. No partial batch was kept.');
}
