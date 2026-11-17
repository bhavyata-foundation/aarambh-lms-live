<?php
// =========================================================================
// ADMISSION DATE FROM ATTENDANCE
//
// A child's admission date is the first day a P (present) or A (absent) was recorded for them.
// Holiday days and blank days do not count. The date only moves earlier (or is filled in if it is
// empty); a later date that a teacher typed is replaced by the earlier attendance day.
// =========================================================================
function sync_admission_dates(mysqli $conn, array $pupilIds): int {
    $ids = array_values(array_unique(array_filter(array_map('intval', $pupilIds), fn($v) => $v > 0)));
    if (!$ids) return 0;
    $updated = 0;
    foreach (array_chunk($ids, 500) as $chunk) {
        $in = implode(',', $chunk);
        $sql = "UPDATE pupils p
                JOIN (SELECT pupil_id, MIN(date) AS first_date
                      FROM daily_attendance
                      WHERE status IN ('present', 'absent') AND pupil_id IN ($in)
                      GROUP BY pupil_id) f ON f.pupil_id = p.id
                SET p.admitted_date = f.first_date
                WHERE p.id IN ($in)
                  AND (p.admitted_date IS NULL OR p.admitted_date > f.first_date)";
        $conn->query($sql);
        $updated += $conn->affected_rows;
    }
    return $updated;
}
