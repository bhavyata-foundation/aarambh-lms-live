<?php
// =========================================================================
// ROLL TOOLS — Admissions: correct a name, clear the roll, tidy up
//
// POST { action, class_id?, … }   (the logged-in teacher's own class only)
//
//   rename        { pupil_id, name, register_no?, confirm_lookalike? }
//                 Changes ONLY the name (and register number if given) —
//                 date of birth, address and the rest are left as they are.
//                 Refused if another child already has that name; asks first
//                 when another child's name sounds the same.
//   remove_all    { confirm: "REMOVE ALL" }
//                 Takes every child off the roll (active = 0). Nothing is
//                 deleted: attendance and marks stay, and an import with the
//                 same names brings each child back — never a duplicate.
//                 Returns the ids, so the screen can undo it.
//   restore       { ids: [..] }   Brings those children back onto the roll.
//   admitted_by   { dates: { pupil_id: "YYYY-MM-DD" } }
//                 A child who appears in an imported register was admitted by
//                 then: their admission date moves EARLIER to that date (never
//                 later), so they show on that register instead of being hidden.
//   removed       →  the children taken off the roll, each with how many
//                 saved records (attendance days, marks …) they have.
//   delete_empty  { confirm: "DELETE" }
//                 PERMANENTLY deletes children who are off the roll AND have
//                 nothing saved anywhere (duplicates, test imports). A child
//                 with any attendance, mark, note, parent or profile is kept.
// =========================================================================
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/pupil_helpers.php';

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$action = (string) ($input['action'] ?? '');
$conn = get_db_connection();
$class = pupil_authorized_class($conn, $input['class_id'] ?? null); // refuses anyone who isn't this class's teacher
$classId = (int) $class['id'];
$cols = pupil_column_set($conn);

// every table that holds something about a child (only those that exist here)
function roll_child_tables($conn)
{
    $want = ['daily_attendance', 'attendance_followups', 'student_holidays', 'observation_assessment', 'workbook_assessment',
             'workbook_activity_assessments', 'workbook_competency_assessment', 'motor_assessment', 'motor_assessment_notes',
             'pretest_sessions', 'pretest_assessments', 'exam_assessments', 'child_activity_ratings', 'assessment_teacher_notes',
             'monthly_review_override', 'parent_children', 'parent_messages', 'family_profiles'];
    $have = [];
    $res = $conn->query("SELECT TABLE_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'pupil_id'");
    while ($r = $res->fetch_row()) $have[$r[0]] = true;
    return array_values(array_filter($want, fn($t) => isset($have[$t])));
}
// how many saved records each child has, [id => n]
function roll_saved_counts($conn, array $ids)
{
    $out = array_fill_keys($ids, 0);
    if (!$ids) return $out;
    $in = implode(',', array_map('intval', $ids));
    foreach (roll_child_tables($conn) as $t) {
        $res = $conn->query("SELECT pupil_id, COUNT(*) FROM `$t` WHERE pupil_id IN ($in) GROUP BY pupil_id");
        while ($r = $res->fetch_row()) $out[(int) $r[0]] += (int) $r[1];
    }
    // Child Record notes are kept as class records keyed by the child's id
    $q = $conn->query("SHOW TABLES LIKE 'class_records'");
    if ($q && $q->num_rows) {
        $res = $conn->query("SELECT record_key, COUNT(*) FROM class_records WHERE kind = 'child_feedback' AND record_key IN ('" . implode("','", array_map('intval', $ids)) . "') GROUP BY record_key");
        while ($res && $r = $res->fetch_row()) $out[(int) $r[0]] = ($out[(int) $r[0]] ?? 0) + (int) $r[1];
    }
    return $out;
}
function roll_class_children($conn, $classId)
{
    $st = $conn->prepare('SELECT id, name, active FROM pupils WHERE class_id = ?');
    $st->bind_param('i', $classId); $st->execute();
    $rows = [];
    foreach ($st->get_result()->fetch_all(MYSQLI_ASSOC) as $r) $rows[(int) $r['id']] = $r;
    $st->close();
    return $rows;
}
function roll_ok($data) { echo json_encode(['status' => 'success'] + $data); exit; }

try {
    if ($action === 'rename') {
        $pupilId = filter_var($input['pupil_id'] ?? null, FILTER_VALIDATE_INT);
        $name = pupil_clean_name($input['name'] ?? '');
        if (!$pupilId) pupil_json_error(400, 'pupil_id is required.');
        if ($name === '') pupil_json_error(400, 'The name can\'t be empty.');
        $all = roll_class_children($conn, $classId);
        if (!isset($all[$pupilId])) pupil_json_error(403, 'This child is not in your class.');
        $old = $all[$pupilId]['name'];
        $others = $all; unset($others[$pupilId]);
        foreach ($others as $o) {
            if (pupil_normalize_name($o['name']) === pupil_normalize_name($name)) {
                pupil_json_error(409, '"' . $o['name'] . '" is already ' . ($o['active'] ? 'on the roll' : 'in this class (taken off the roll)') . '. If they are the same child, remove the duplicate instead of renaming.');
            }
        }
        $look = pupil_find_lookalike($others, $name);
        if ($look !== null && empty($input['confirm_lookalike'])) {
            http_response_code(409);
            echo json_encode(['status' => 'error', 'code' => 'lookalike', 'existing_name' => $others[$look]['name'],
                'message' => 'This name sounds like "' . $others[$look]['name'] . '", another child in this class. Rename anyway?']);
            exit;
        }
        $setReg = array_key_exists('register_no', $input) && isset($cols['register_no']);
        $reg = $setReg ? trim((string) $input['register_no']) : null;
        if ($setReg && $reg !== '') {
            $st = $conn->prepare('SELECT name FROM pupils WHERE class_id = ? AND register_no = ? AND id <> ? AND active = 1 LIMIT 1');
            $st->bind_param('isi', $classId, $reg, $pupilId); $st->execute();
            $taken = $st->get_result()->fetch_assoc(); $st->close();
            if ($taken) pupil_json_error(409, 'Register number ' . $reg . ' already belongs to ' . $taken['name'] . '.');
        }
        if ($setReg) {
            $regOrNull = $reg === '' ? null : $reg;
            $st = $conn->prepare('UPDATE pupils SET name = ?, register_no = ? WHERE id = ? AND class_id = ?');
            $st->bind_param('ssii', $name, $regOrNull, $pupilId, $classId);
        } else {
            $st = $conn->prepare('UPDATE pupils SET name = ? WHERE id = ? AND class_id = ?');
            $st->bind_param('sii', $name, $pupilId, $classId);
        }
        $st->execute(); $st->close();
        roll_ok(['pupil_id' => $pupilId, 'old_name' => $old, 'name' => $name]);
    }

    if ($action === 'remove_all') {
        if (($input['confirm'] ?? '') !== 'REMOVE ALL') pupil_json_error(400, 'Type REMOVE ALL to confirm.');
        $ids = array_keys(array_filter(roll_class_children($conn, $classId), fn($r) => (int) $r['active'] === 1));
        if ($ids) $conn->query('UPDATE pupils SET active = 0 WHERE class_id = ' . $classId . ' AND id IN (' . implode(',', $ids) . ')');
        roll_ok(['removed' => count($ids), 'ids' => $ids]);
    }

    if ($action === 'restore') {
        $want = array_values(array_filter(array_map('intval', is_array($input['ids'] ?? null) ? $input['ids'] : [])));
        $all = roll_class_children($conn, $classId);
        $activeNames = [];
        foreach ($all as $r) if ((int) $r['active'] === 1) $activeNames[pupil_normalize_name($r['name'])] = true;
        $back = []; $skipped = [];
        foreach ($want as $id) {
            if (!isset($all[$id]) || (int) $all[$id]['active'] === 1) continue;
            $k = pupil_normalize_name($all[$id]['name']);
            if (isset($activeNames[$k])) { $skipped[] = $all[$id]['name'] . ' (a child with this name is already back on the roll)'; continue; }
            $activeNames[$k] = true; $back[] = $id;
        }
        if ($back) $conn->query('UPDATE pupils SET active = 1 WHERE class_id = ' . $classId . ' AND id IN (' . implode(',', $back) . ')');
        roll_ok(['restored' => count($back), 'skipped' => $skipped]);
    }

    if ($action === 'admitted_by') {
        $dates = is_array($input['dates'] ?? null) ? $input['dates'] : [];
        $all = roll_class_children($conn, $classId);
        $st = $conn->prepare('UPDATE pupils SET admitted_date = ? WHERE id = ? AND class_id = ? AND (admitted_date IS NULL OR admitted_date > ?)');
        $moved = 0;
        foreach ($dates as $id => $date) {
            $id = (int) $id; $date = (string) $date;
            if (!isset($all[$id]) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) continue;
            $st->bind_param('siis', $date, $id, $classId, $date); $st->execute();
            $moved += $st->affected_rows;
        }
        $st->close();
        roll_ok(['moved' => $moved]);
    }

    if ($action === 'removed' || $action === 'delete_empty') {
        $off = array_filter(roll_class_children($conn, $classId), fn($r) => (int) $r['active'] === 0);
        $counts = roll_saved_counts($conn, array_keys($off));
        if ($action === 'removed') {
            roll_ok(['children' => array_values(array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name'], 'saved' => $counts[(int) $r['id']] ?? 0], $off))]);
        }
        if (($input['confirm'] ?? '') !== 'DELETE') pupil_json_error(400, 'Type DELETE to confirm.');
        $empty = array_keys(array_filter($counts, fn($n) => $n === 0));
        $names = array_map(fn($id) => $off[$id]['name'], $empty);
        if ($empty) $conn->query('DELETE FROM pupils WHERE class_id = ' . $classId . ' AND active = 0 AND id IN (' . implode(',', array_map('intval', $empty)) . ')');
        roll_ok(['deleted' => count($empty), 'names' => $names, 'kept_with_data' => count($off) - count($empty)]);
    }

    pupil_json_error(400, 'Unknown action.');
} catch (Throwable $e) {
    error_log('roll_tools failed: ' . $e->getMessage());
    pupil_json_error(500, 'Could not update the roll. Nothing was changed.');
}
