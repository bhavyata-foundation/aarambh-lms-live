<?php
// Return the active roster for the teacher's currently selected class.
// The old endpoint returned every class linked to a teacher, while the UI
// displayed only the first class. That mixed pupil lists across classes.

session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/pupil_helpers.php';

try {
    $conn = get_db_connection();
    $class = pupil_authorized_class($conn, $_GET['class_id'] ?? null);
    $pupils = pupil_active_roster($conn, $class['id']);
    $conn->close();

    echo json_encode([
        'status' => 'success',
        'class_id' => $class['id'],
        'school_id' => $class['school_id'],
        'pupils' => $pupils,
    ]);
} catch (Throwable $e) {
    error_log('get_my_pupils failed: ' . $e->getMessage());
    pupil_json_error(500, 'Could not load the class roster.');
}
