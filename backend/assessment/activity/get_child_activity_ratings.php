<?php

session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../pupils/pupil_helpers.php';

try {
    $conn = get_db_connection();

    $classId = filter_var(
        $_GET['class_id'] ?? null,
        FILTER_VALIDATE_INT
    );

    $weekNumber = filter_var(
        $_GET['week_number'] ?? null,
        FILTER_VALIDATE_INT
    );

    if (
        !$classId ||
        !$weekNumber ||
        $weekNumber < 1 ||
        $weekNumber > 60
    ) {
        pupil_json_error(
            400,
            'A valid class_id and week_number are required.'
        );
    }

    $class = pupil_authorized_class($conn, $classId);
    $authorizedClassId = (int) $class['id'];

    $stmt = $conn->prepare(
        'SELECT
            r.pupil_id,
            r.domain_key,
            r.rating
         FROM child_activity_ratings r
         INNER JOIN pupils p
           ON p.id = r.pupil_id
          AND p.class_id = r.class_id
          AND p.active = 1
         WHERE r.class_id = ?
           AND r.week_number = ?
         ORDER BY r.pupil_id, r.domain_key'
    );

    $stmt->bind_param(
        'ii',
        $authorizedClassId,
        $weekNumber
    );

    $stmt->execute();
    $result = $stmt->get_result();

    $ratings = [];

    while ($row = $result->fetch_assoc()) {
        $pupilId = (string) ((int) $row['pupil_id']);

        if (!isset($ratings[$pupilId])) {
            $ratings[$pupilId] = [];
        }

        $ratings[$pupilId][$row['domain_key']] =
            $row['rating'];
    }

    $stmt->close();
    $conn->close();

    echo json_encode([
        'status' => 'success',
        'class_id' => $authorizedClassId,
        'week_number' => $weekNumber,
        'ratings' => (object) $ratings
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    if (isset($conn)) {
        try {
            $conn->close();
        } catch (Throwable $ignored) {
        }
    }

    error_log(
        'get_child_activity_ratings failed: ' .
        $e->getMessage()
    );

    pupil_json_error(
        500,
        'Could not load this week\'s ratings.'
    );
}