<?php
// =========================================================================
// Shared by get_class_records.php and save_class_record.php.
// Only the logged-in teacher (users/teacher_auth.php), only her own class,
// only the kinds listed here.
// =========================================================================
session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');
set_exception_handler(function ($e) {
    http_response_code(500);
    // A missing table is the usual cause: say which one, so it can be fixed.
    $msg = 'Server error.';
    if ($e instanceof mysqli_sql_exception && (int) $e->getCode() === 1146) {
        $msg = 'The class_records table is missing. Run backend/sql/create_class_records.sql in phpMyAdmin.';
    }
    echo json_encode(['status' => 'error', 'message' => $msg]);
    exit;
});

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../users/teacher_auth.php';

// The kinds of record a teacher can keep here. Add a kind here before
// any screen can use it — nothing else gets in.
const CLASS_RECORD_KINDS = ['effective', 'tlm_signed', 'transition', 'child_feedback', 'name_alias', 'import_log']; // import_log: what was imported and when, so the same data imported twice is caught (js/import-guard.js). name_alias: a child's name as misspelled in imported files → that child (js/name-match.js) // transition: one record per child per school year; child_feedback: Child Record notes, one per child
const CLASS_RECORD_MAX_BYTES = 20000; // one record; labels are tiny

function records_fail($code, $message)
{
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

function records_role_check()
{
    $isLocal = teacher_auth_is_local();
    $devRole = ($isLocal && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
    if (($_SESSION['role'] ?? $devRole) !== 'teacher') records_fail(401, 'Not authorized.');
}

// The class, checked against the logged-in teacher.
function records_own_class($conn, $teacherId, $classId)
{
    $classId = filter_var($classId, FILTER_VALIDATE_INT);
    if (!$classId) records_fail(400, 'class_id is required.');
    $stmt = $conn->prepare('SELECT id FROM classes WHERE id = ? AND teacher_user_id = ? LIMIT 1');
    $stmt->bind_param('ii', $classId, $teacherId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) records_fail(403, 'This class is not linked to your login.');
    return (int) $row['id'];
}

function records_kind($kind)
{
    $kind = (string) $kind;
    if (!in_array($kind, CLASS_RECORD_KINDS, true)) records_fail(400, 'Unknown record kind.');
    return $kind;
}