<?php

session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

require_once __DIR__ . '/../../users/db_config.php';
require_once __DIR__ . '/../../pupils/pupil_helpers.php';

$input = json_decode(
    file_get_contents('php://input'),
    true
) ?? [];

try {
    $conn = get_db_connection();

    $classId = filter_var(
        $input['class_id'] ?? null,
        FILTER_VALIDATE_INT
    );

    $pupilId = filter_var(
        $input['pupil_id'] ?? null,
        FILTER_VALIDATE_INT
    );

    $weekNumber = filter_var(
        $input['week_number'] ?? null,
        FILTER_VALIDATE_INT
    );

    $domainKey = trim(
        (string) ($input['domain_key'] ?? '')
    );

    $rating = array_key_exists('rating', $input)
        ? $input['rating']
        : null;

    if ($rating === '') {
        $rating = null;
    }

    if (
        !$classId ||
        !$pupilId ||
        !$weekNumber ||
        $weekNumber < 1 ||
        $weekNumber > 60
    ) {
        pupil_json_error(
            400,
            'A valid class_id, pupil_id and week_number are required.'
        );
    }

    $allowedDomains = [
        'welcome',
        'story',
        'numeracy',
        'language',
        'create',
        'outdoor',
        'tidy',
        'reflect'
    ];

    if (!in_array($domainKey, $allowedDomains, true)) {
        pupil_json_error(
            400,
            'Invalid activity domain.'
        );
    }

    if (
        $rating !== null &&
        !in_array($rating, ['E', 'P', 'A'], true)
    ) {
        pupil_json_error(
            400,
            'Rating must be E, P, A or null.'
        );
    }

    $class = pupil_authorized_class($conn, $classId);
    $authorizedClassId = (int) $class['id'];

    $stmt = $conn->prepare(
        'SELECT id
         FROM pupils
         WHERE id = ?
           AND class_id = ?
           AND active = 1
         LIMIT 1'
    );

    $stmt->bind_param(
        'ii',
        $pupilId,
        $authorizedClassId
    );

    $stmt->execute();

    $pupilExists =
        (bool) $stmt->get_result()->fetch_assoc();

    $stmt->close();

    if (!$pupilExists) {
        pupil_json_error(
            403,
            'This child is not active in your class.'
        );
    }

    if ($rating === null) {
        $stmt = $conn->prepare(
            'DELETE FROM child_activity_ratings
             WHERE class_id = ?
               AND pupil_id = ?
               AND week_number = ?
               AND domain_key = ?'
        );

        $stmt->bind_param(
            'iiis',
            $authorizedClassId,
            $pupilId,
            $weekNumber,
            $domainKey
        );

        $stmt->execute();
        $stmt->close();

    } else {
        $updatedBy = (int) $class['teacher_user_id'];

        $stmt = $conn->prepare(
            'INSERT INTO child_activity_ratings
                (
                    class_id,
                    pupil_id,
                    week_number,
                    domain_key,
                    rating,
                    updated_by
                )
             VALUES (?, ?, ?, ?, ?, ?)

             ON DUPLICATE KEY UPDATE
                rating = VALUES(rating),
                updated_by = VALUES(updated_by),
                updated_at = CURRENT_TIMESTAMP'
        );

        $stmt->bind_param(
            'iiissi',
            $authorizedClassId,
            $pupilId,
            $weekNumber,
            $domainKey,
            $rating,
            $updatedBy
        );

        $stmt->execute();
        $stmt->close();
    }

    $conn->close();

    echo json_encode([
        'status' => 'success',
        'class_id' => $authorizedClassId,
        'pupil_id' => $pupilId,
        'week_number' => $weekNumber,
        'domain_key' => $domainKey,
        'rating' => $rating
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    if (isset($conn)) {
        try {
            $conn->close();
        } catch (Throwable $ignored) {
        }
    }

    error_log(
        'save_child_activity_rating failed: ' .
        $e->getMessage()
    );

    pupil_json_error(
        500,
        'Could not save that rating.'
    );
}