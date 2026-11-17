<?php
// =========================================================================
// backend/ai/read_photo.php — read a photo of a register / marksheet (Claude)
// -------------------------------------------------------------------------
// POST JSON { kind, image (base64, no data: prefix), media_type, context }
//   kind     'attendance' | 'pretest' | 'observation' | 'workbook' | 'motor'
//   context  { children: [{reg, name}], month, year, days, columns: [labels] }
// → { status: 'success', grid: [[…], …], notes }   (grid = rows × columns,
//    the first row is the heading row, as in an Excel sheet)
// Logged-in staff only. The API key stays here, on the server.
// =========================================================================
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function ai_fail($code, $msg){ http_response_code($code); echo json_encode(['status' => 'error', 'message' => $msg], JSON_UNESCAPED_UNICODE); exit; }

if (empty($_SESSION['user_id'])) ai_fail(401, 'Please log in again.');
if (!in_array($_SESSION['role'] ?? '', ['teacher', 'supervisor', 'principal', 'superadmin'], true)) ai_fail(403, 'Not allowed.');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') ai_fail(405, 'Use POST.');
require_once __DIR__ . '/ai_config.php';
if (!defined('ANTHROPIC_API_KEY') || ANTHROPIC_API_KEY === '' || ANTHROPIC_API_KEY === 'PASTE_YOUR_ANTHROPIC_API_KEY_HERE')
    ai_fail(503, 'The AI photo reader is not set up yet: the API key is missing in backend/ai/ai_config.php.');
if (!function_exists('curl_init')) ai_fail(500, 'The server cannot reach the AI service (PHP curl is off).');

$in = json_decode(file_get_contents('php://input'), true) ?: [];
$kind = (string) ($in['kind'] ?? '');
$kinds = ['attendance', 'pretest', 'observation', 'workbook', 'motor'];
if (!in_array($kind, $kinds, true)) ai_fail(400, 'Unknown kind of sheet.');
$image = preg_replace('/^data:[^,]+,/', '', (string) ($in['image'] ?? ''));
$type = (string) ($in['media_type'] ?? 'image/jpeg');
if (!in_array($type, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) ai_fail(400, 'The photo must be a JPG, PNG or WebP.');
if ($image === '' || strlen($image) > 7 * 1024 * 1024) ai_fail(400, 'The photo is missing or too large (send it at most about 5 MB).');

$ctx = is_array($in['context'] ?? null) ? $in['context'] : [];
$kids = array_slice(array_values(array_filter((array) ($ctx['children'] ?? []), 'is_array')), 0, 80);
$kidLines = implode("\n", array_map(fn($k) => '- ' . trim((string) ($k['reg'] ?? '')) . ' | ' . trim((string) ($k['name'] ?? '')), $kids));
$cols = array_slice(array_map('strval', (array) ($ctx['columns'] ?? [])), 0, 80);

// ---- the instructions for each kind of sheet ----
$common = "You read photographs of handwritten or printed school sheets from municipal pre-primary schools in Mumbai (Junior KG / Senior KG). "
  . "Names may be in English, Marathi or Hindi; write each name in English letters as it is written, and if it clearly matches a child in the class list below, use that child's spelling and register number exactly. "
  . "Never invent a child, a mark or a date: a cell you cannot read stays empty. "
  . "Reply with ONLY one JSON object, no other text, in this shape: {\"grid\": [[heading cells…], [row cells…], …], \"notes\": \"…\"}. "
  . "\"grid\" is the table as rows of text cells, like an Excel sheet; the first row is the heading row. "
  . "\"notes\" is one or two short sentences, in plain English, about anything unclear (cells you could not read, a torn or blurred part), or \"\" if everything was clear.\n\n"
  . ($kidLines ? "The children of this class (register no | name):\n" . $kidLines . "\n\n" : '');
if ($kind === 'attendance') {
    $month = trim((string) ($ctx['month'] ?? '')); $year = (int) ($ctx['year'] ?? 0); $days = max(28, min(31, (int) ($ctx['days'] ?? 31)));
    $prompt = $common . "This is a monthly ATTENDANCE REGISTER" . ($month ? " for $month $year" : '') . ". "
      . "Build the grid like this:\n"
      . "- first row: \"Register No\", \"Name\", then the day numbers that have columns in the photo (\"1\", \"2\", … up to \"$days\").\n"
      . "- then one row per child, in the order of the photo: the register number (or \"\"), the name, then for each day exactly one of: \"P\" (present: P, ✓, a tick or a dot), \"A\" (absent: A, ✗, a cross or a zero), \"H\" (holiday or Sunday column: H, a line through the column or a written holiday), or \"\" if empty or unreadable.\n"
      . "Leave out total / summary columns and rows (Total, Present days, %).";
} else {
    $what = ['pretest' => 'PRE-TEST', 'observation' => 'CLASSROOM OBSERVATION', 'workbook' => 'WORKBOOK', 'motor' => 'FINE & GROSS MOTOR'][$kind];
    $marks = $kind === 'motor' ? "\"R\" (red / not yet), \"Y\" (yellow / developing) or \"G\" (green / achieved)" : "\"B\" (Beginner, also written E, 1 or ✗), \"P\" (Proficient, also 2) or \"A\" (Advanced, also 3 or ✓✓)";
    $prompt = $common . "This is a $what MARKSHEET: one row per child, one column per activity / competency. "
      . ($cols ? "Its columns are these items; use exactly these texts as the headings of the columns you find (copy them character for character, and leave out items that have no column in the photo):\n" . implode("\n", array_map(fn($c) => '- ' . $c, $cols)) . "\n" : '')
      . "Build the grid like this:\n"
      . "- first row: \"Register No\", \"Name\", then the item headings.\n"
      . "- then one row per child: the register number (or \"\"), the name, then for each item exactly one of $marks, \"AB\" if the child was marked absent for it, or \"\" if empty or unreadable.\n"
      . "Leave out total / summary columns and rows.";
}

$payload = [
    'model' => ANTHROPIC_MODEL,
    'max_tokens' => ANTHROPIC_MAX_TOKENS,
    'messages' => [[ 'role' => 'user', 'content' => [
        ['type' => 'image', 'source' => ['type' => 'base64', 'media_type' => $type, 'data' => $image]],
        ['type' => 'text', 'text' => $prompt]
    ]]]
];
$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true, CURLOPT_TIMEOUT => 120, CURLOPT_CONNECTTIMEOUT => 15,
    CURLOPT_HTTPHEADER => ['content-type: application/json', 'x-api-key: ' . ANTHROPIC_API_KEY, 'anthropic-version: 2023-06-01'],
    CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE)
]);
$raw = curl_exec($ch); $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); $cerr = curl_error($ch); curl_close($ch);
if ($raw === false) ai_fail(502, 'The AI service could not be reached (' . $cerr . '). Try again in a minute.');
$res = json_decode($raw, true);
if ($code !== 200) {
    $m = $res['error']['message'] ?? ('HTTP ' . $code);
    if ($code === 401) $m = 'The API key in backend/ai/ai_config.php is not accepted — check it on console.anthropic.com.';
    if ($code === 429) $m = 'The AI service is busy or the account limit was reached — try again in a minute.';
    if ($code === 400 && stripos($m, 'credit') !== false) $m = 'The AI account has no credit left — add credit on console.anthropic.com.';
    error_log('read_photo: ' . $code . ' ' . substr($raw, 0, 400));
    ai_fail(502, 'The AI could not read the photo: ' . $m);
}
$text = '';
foreach (($res['content'] ?? []) as $block) if (($block['type'] ?? '') === 'text') $text .= $block['text'];
$text = trim(preg_replace('/^```(?:json)?\s*|\s*```$/', '', trim($text)));
$i = strpos($text, '{'); $j = strrpos($text, '}');
$out = ($i !== false && $j !== false) ? json_decode(substr($text, $i, $j - $i + 1), true) : null;
if (!is_array($out) || !is_array($out['grid'] ?? null) || count($out['grid']) < 2)
    ai_fail(502, 'The AI did not find a table in this photo. Take the photo again — flat, straight, in good light, the whole sheet in view.');
$grid = array_map(fn($r) => array_map(fn($c) => is_scalar($c) ? trim((string) $c) : '', is_array($r) ? $r : []), $out['grid']);
echo json_encode(['status' => 'success', 'grid' => $grid, 'notes' => (string) ($out['notes'] ?? ''),
    'stop_reason' => $res['stop_reason'] ?? '', 'model' => ANTHROPIC_MODEL], JSON_UNESCAPED_UNICODE);
