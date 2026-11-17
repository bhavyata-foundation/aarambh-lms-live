<?php
// ============================================================
// GET MOTOR ASSESSMENT — every fine & gross motor rating and note
// for the teacher's class.
// File: backend/assessment/motor/get_motor_assessment.php
// GET: class_id
// ============================================================

session_start();
header('Content-Type: application/json; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');
set_exception_handler(function($e){
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
});

// Same role / user-id / error helpers the leave and flags endpoints use.
require_once __DIR__ . '/../../teacher_leave/leave_helpers.php';
if (leave_effective_role() !== 'teacher') leave_json_error(401, 'Not authorized.');

require_once __DIR__ . '/../../users/db_config.php';
$conn = get_db_connection();
$teacherId = leave_user_id($conn, 'teacher');
if (!$teacherId) leave_json_error(401, 'Could not determine teacher.');

// The class must belong to this teacher.
function motor_check_class($conn, $classId, $teacherId){
    $stmt = $conn->prepare("SELECT id FROM classes WHERE id = ? AND teacher_user_id = ? LIMIT 1");
    $stmt->bind_param('ii', $classId, $teacherId);
    $stmt->execute();
    $ok = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$ok) leave_json_error(403, 'This class does not belong to the logged-in teacher.');
}
// The child must be an active pupil of that class.
function motor_check_pupil($conn, $pupilId, $classId){
    $stmt = $conn->prepare("SELECT id FROM pupils WHERE id = ? AND class_id = ? AND active = 1 LIMIT 1");
    $stmt->bind_param('ii', $pupilId, $classId);
    $stmt->execute();
    $ok = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$ok) leave_json_error(403, 'This child is not in your class.');
}

$classId = filter_var($_GET['class_id'] ?? null, FILTER_VALIDATE_INT);
if (!$classId) leave_json_error(400, 'class_id is required.');
motor_check_class($conn, $classId, $teacherId);


// TRANSLATE — Google Cloud Translation. target 'en' = Hindi to English, target 'hi' = English to Hindi.
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$texts = array_values(array_filter(array_map('strval', (array) ($in['texts'] ?? [])), fn($t) => trim($t) !== ''));
$target = (($in['target'] ?? 'en') === 'hi') ? 'hi' : 'en';
$source = $target === 'hi' ? 'en' : 'hi';
if (!$texts) { echo json_encode(['status' => 'success', 'translations' => []]); exit; }
$cfg = require __DIR__ . '/google_translate_config.php';
$key = trim((string) ($cfg['api_key'] ?? ''));
if ($key === '' || stripos($key, 'PASTE') !== false) { echo json_encode(['status' => 'error', 'message' => 'Google Translate key is not set in google_translate_config.php']); exit; }
$out = [];
foreach (array_chunk($texts, 100) as $chunk) {
    $ch = curl_init('https://translation.googleapis.com/language/translate/v2?key=' . urlencode($key));
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['q' => $chunk, 'source' => $source, 'target' => $target, 'format' => 'text']),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $j = json_decode((string) $resp, true);
    if ($resp === false || $code !== 200 || !isset($j['data']['translations'])) {
        $msg = $j['error']['message'] ?? 'translation request failed';
        echo json_encode(['status' => 'error', 'message' => $msg]); exit;
    }
    foreach ($j['data']['translations'] as $t) { $out[] = html_entity_decode((string) $t['translatedText'], ENT_QUOTES, 'UTF-8'); }
}
echo json_encode(['status' => 'success', 'translations' => $out], JSON_UNESCAPED_UNICODE);
