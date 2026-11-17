<?php
// ============================================================
// Shared by every teacher_leave endpoint.
// File: backend/teacher_leave/leave_helpers.php
// ============================================================

// Same teacher working-day rules as teacher.js (teacherWorkingDaysInMonth
// + complianceHolidayName): Monday–Saturday, except Sundays, the last
// Saturday of the month, and the same fixed holidays. If holidays are
// added in teacher.js, add them here too so both sides agree.
function leave_fixed_holiday($ts){
    $md = date('n-j', $ts); // month-day, no leading zeros
    $holidays = ['1-26' => true, '5-1' => true, '8-15' => true, '10-2' => true];
    return isset($holidays[$md]);
}

function leave_is_last_saturday($ts){
    if (date('w', $ts) !== '6') return false;
    return date('n', strtotime('+7 days', $ts)) !== date('n', $ts);
}

// Returns every teacher working date (Y-m-d) from start to end inclusive.
function leave_working_dates($startDate, $endDate){
    $dates = [];
    $ts = strtotime($startDate . ' 00:00:00');
    $endTs = strtotime($endDate . ' 00:00:00');
    while ($ts <= $endTs) {
        $dow = date('w', $ts);
        if ($dow !== '0' && !leave_is_last_saturday($ts) && !leave_fixed_holiday($ts)) {
            $dates[] = date('Y-m-d', $ts);
        }
        $ts = strtotime('+1 day', $ts);
    }
    return $dates;
}

function leave_json_error($code, $message){
    http_response_code($code);
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

// Session role, or the localhost-only dev_role bypass used across the app.
function leave_effective_role(){
    $requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
    $isLocal = in_array($requestHost, ['localhost', '127.0.0.1'], true);
    $devRole = ($isLocal && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
    return $_SESSION['role'] ?? $devRole;
}

// Real user id, or (dev bypass only) the first account with that role —
// same fallback mark_teacher_attendance.php and get_my_school.php use.
function leave_user_id($conn, $role){
    if (isset($_SESSION['user_id'])) return (int) $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT id FROM users WHERE role = ? ORDER BY id LIMIT 1");
    $stmt->bind_param('s', $role);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $row ? (int) $row['id'] : null;
}