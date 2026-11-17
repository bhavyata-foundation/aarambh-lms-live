<?php
// =========================================================================
// backend/content/content_common.php — shared by the content files
// Login checks, JSON replies, input checks, and the change log.
// =========================================================================
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
require_once __DIR__ . '/../users/db_config.php';

function content_fail($code, $msg){ http_response_code($code); echo json_encode(['status' => 'error', 'message' => $msg]); exit; }
// characters in a text (works whether or not PHP has the mbstring extension)
function content_len($s){ return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : preg_match_all('/./us', (string) $s); }
function content_ok($data = []){ echo json_encode(array_merge(['status' => 'success'], $data)); exit; }
function content_require_login(){ if(empty($_SESSION['user_id'])) content_fail(401, 'Please log in again.'); }
// Only a superadmin may change content. The server checks this on every change.
function content_require_superadmin(){
    content_require_login();
    if(($_SESSION['role'] ?? '') !== 'superadmin') content_fail(403, 'Only a superadmin can change the activities.');
}
function content_level($v){ $v = trim((string) $v); if(!in_array($v, ['Jr KG', 'Sr KG'], true)) content_fail(400, 'Class must be Jr KG or Sr KG.'); return $v; }
function content_text($v, $label, $max = 255){
    $v = trim(preg_replace('/\s+/', ' ', (string) $v));
    if(content_len($v) < 2) content_fail(400, $label . ' is too short.');
    if(content_len($v) > $max) content_fail(400, $label . ' is too long (at most ' . $max . ' characters).');
    return $v;
}
// "1.2", "CG 1.2", "C-1.2", "CG-1" → "CG 1.2" / "CG 1" (the Pre-Test's own format)
function content_pretest_cg($v){
    if(!preg_match('/^\s*C?\s*G?\s*[-–.]?\s*(\d{1,2})(?:\.(\d{1,2}))?\s*$/i', (string) $v, $m)) content_fail(400, 'CG / competency must look like 1.2 (or CG 1.2, C-1.2).');
    if((int) $m[1] < 1 || (int) $m[1] > 13) content_fail(400, 'There are 13 CGs (CG-1 … CG-13).');
    return 'CG ' . (int) $m[1] . (isset($m[2]) && $m[2] !== '' ? '.' . (int) $m[2] : '');
}
// "1.2", "C 1.2", "CG-1.2" → "C-1.2" (the observation format)
function content_competency($v){
    if(!preg_match('/^\s*C?\s*G?\s*[-–.]?\s*(\d{1,2})\.(\d{1,2})\s*$/i', (string) $v, $m)) content_fail(400, 'Competency must look like C-1.2.');
    if((int) $m[1] < 1 || (int) $m[1] > 13) content_fail(400, 'There are 13 CGs (C-1.x … C-13.x).');
    return 'C-' . (int) $m[1] . '.' . (int) $m[2];
}
function content_month($v){
    $months = ['June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March', 'April'];
    $v = ucfirst(strtolower(trim((string) $v)));
    if(!in_array($v, $months, true)) content_fail(400, 'Month must be June … April.');
    return $v;
}
function content_log($conn, $what, $ref, $action, $before, $after){
    $by = (int) ($_SESSION['user_id'] ?? 0);
    $b = $before === null ? null : json_encode($before, JSON_UNESCAPED_UNICODE);
    $a = $after === null ? null : json_encode($after, JSON_UNESCAPED_UNICODE);
    $st = $conn->prepare('INSERT INTO content_changes (changed_by, what, ref, action, before_json, after_json) VALUES (?, ?, ?, ?, ?, ?)');
    $st->bind_param('isssss', $by, $what, $ref, $action, $b, $a); $st->execute(); $st->close();
}
