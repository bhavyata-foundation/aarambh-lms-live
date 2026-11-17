<?php
// Motor ratings are stored as B / P / A. Old G / Y / R letters are converted on the way in.
function motor_rating_norm($raw): ?string
{
    $map = ['B' => 'B', 'P' => 'P', 'A' => 'A', 'R' => 'B', 'Y' => 'P', 'G' => 'A'];
    $v = strtoupper(trim((string) $raw));
    return $map[$v] ?? null;
}

// Writes one child's competency rows for one skill and month, from motor_activity_competency.
// A null rating clears them.
function motor_write_competency($conn, int $classId, int $pupilId, string $skill, string $month, ?string $rating): void
{
    $del = $conn->prepare("DELETE FROM motor_competency_marks WHERE class_id = ? AND pupil_id = ? AND skill_type = ? AND month = ?");
    $del->bind_param('iiss', $classId, $pupilId, $skill, $month);
    $del->execute();
    $del->close();
    if ($rating === null) {
        return;
    }
    $ins = $conn->prepare("INSERT INTO motor_competency_marks (class_id, pupil_id, skill_type, month, competency_code, activity, rating, level_mark) SELECT ?, ?, m.skill_type, m.month, m.competency_code, m.activity, ?, ? FROM motor_activity_competency m WHERE m.skill_type = ? AND m.month = ?");
    $ins->bind_param('iissss', $classId, $pupilId, $rating, $rating, $skill, $month);
    $ins->execute();
    $ins->close();
}
