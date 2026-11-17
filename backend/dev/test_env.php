<?php
// =========================================================================
// TEST ENVIRONMENT — a separate copy of the database for testing.
// File: backend/dev/test_env.php
// Open on the XAMPP computer only: http://localhost/aarambh-lms/backend/dev/test_env.php
//
//   1. Make / refresh the test copy (aarambh_lms_test) from the real data.
//   2. Put a browser in test mode — it then uses the test copy, with an
//      orange TEST MODE banner on every page. Other devices join with a link.
//   3. Save test checkpoints and reset the TEST copy as often as you like.
//
// This page only ever writes to the TEST database. The real database is
// only read (to make the copy) — it is never reset or changed from here.
// =========================================================================

$host = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$remote = $_SERVER['REMOTE_ADDR'] ?? '';
if (!in_array($host, ['localhost', '127.0.0.1'], true) || !in_array($remote, ['127.0.0.1', '::1'], true) || !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    http_response_code(403);
    echo 'The test environment can only be managed on the XAMPP computer itself (http://localhost/…).';
    exit;
}

session_start();
set_time_limit(0);
ini_set('memory_limit', '512M');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/../users/db_config.php';   // for host / user / password / port
require_once __DIR__ . '/test_env_switch.php';
$LIVE = $db_live_name ?? 'aarambh_lms';
$TEST = $LIVE . '_test';

function db_connect($name){
    global $db_host, $db_user, $db_pass, $db_port;
    $c = new mysqli($db_host, $db_user, $db_pass, $name, $db_port);
    $c->set_charset('utf8mb4');
    return $c;
}
function server_connect(){
    global $db_host, $db_user, $db_pass, $db_port;
    $c = new mysqli($db_host, $db_user, $db_pass, '', $db_port);
    $c->set_charset('utf8mb4');
    return $c;
}
function h($s){ return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }

$dir = __DIR__ . '/test_checkpoints';
if (!is_dir($dir)) mkdir($dir, 0775, true);
foreach ([__DIR__, $dir] as $d) if (!file_exists($d . '/.htaccess')) file_put_contents($d . '/.htaccess', "<FilesMatch \"\\.(sql|txt|json)$\">\nRequire all denied\n</FilesMatch>\n");
$statusFile = $dir . '/_status.json';
$status = is_file($statusFile) ? (json_decode(file_get_contents($statusFile), true) ?: []) : [];
function save_status($f, $s){ file_put_contents($f, json_encode($s, JSON_PRETTY_PRINT)); }

const CP_END = "\n-- @@END-OF-STATEMENT@@\n";

function base_tables($conn){
    $t = [];
    $r = $conn->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    while ($row = $r->fetch_row()) $t[] = $row[0];
    return $t;
}
function safe_label($s){ return trim(substr(preg_replace('/[^A-Za-z0-9 _-]/', '', (string) $s), 0, 40)); }

// Full copy of one database into a .sql file (structure + every row).
function dump_database($dbName, $file, $label){
    $conn = db_connect($dbName);   // streams rows
    $esc  = db_connect($dbName);   // escapes values while the other connection streams
    $tmp = $file . '.part';
    $fh = fopen($tmp, 'wb');
    $tables = base_tables($conn);
    $rowsTotal = 0;
    fwrite($fh, "-- Aarambh LMS checkpoint\n-- database: $dbName\n-- label: " . safe_label($label) . "\n-- created: " . date('Y-m-d H:i:s') . "\n-- tables: " . implode(',', $tables) . "\n");
    fwrite($fh, "SET FOREIGN_KEY_CHECKS = 0" . CP_END . "SET NAMES utf8mb4" . CP_END . "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO'" . CP_END);
    foreach ($tables as $t) {
        $q = '`' . str_replace('`', '``', $t) . '`';
        fwrite($fh, "DROP TABLE IF EXISTS $q" . CP_END);
        fwrite($fh, $conn->query("SHOW CREATE TABLE $q")->fetch_row()[1] . CP_END);
        $res = $conn->query("SELECT * FROM $q", MYSQLI_USE_RESULT);
        $fields = $res->fetch_fields();
        $isBinary = array_map(fn($f) => $f->charsetnr == 63 && in_array($f->type, [MYSQLI_TYPE_BLOB, MYSQLI_TYPE_TINY_BLOB, MYSQLI_TYPE_MEDIUM_BLOB, MYSQLI_TYPE_LONG_BLOB, MYSQLI_TYPE_STRING, MYSQLI_TYPE_VAR_STRING], true), $fields);
        $cols = implode(', ', array_map(fn($f) => '`' . str_replace('`', '``', $f->name) . '`', $fields));
        $batch = [];
        while ($row = $res->fetch_row()) {
            $vals = [];
            foreach ($row as $i => $v) {
                if ($v === null) $vals[] = 'NULL';
                elseif ($isBinary[$i]) $vals[] = $v === '' ? "''" : '0x' . bin2hex($v);
                else $vals[] = "'" . $esc->real_escape_string((string) $v) . "'";
            }
            $batch[] = '(' . implode(', ', $vals) . ')';
            $rowsTotal++;
            if (count($batch) >= 200) { fwrite($fh, "INSERT INTO $q ($cols) VALUES\n" . implode(",\n", $batch) . CP_END); $batch = []; }
        }
        if ($batch) fwrite($fh, "INSERT INTO $q ($cols) VALUES\n" . implode(",\n", $batch) . CP_END);
        $res->free();
    }
    fwrite($fh, "SET FOREIGN_KEY_CHECKS = 1" . CP_END . "-- @@CHECKPOINT-COMPLETE@@\n");
    fclose($fh);
    rename($tmp, $file);   // a half-written file never gets the .sql name
    $conn->close(); $esc->close();
    return [count($tables), $rowsTotal];
}

function checkpoint_meta($path){
    $fh = fopen($path, 'rb'); $meta = ['label' => '', 'created' => '', 'database' => '', 'tables' => []];
    for ($i = 0; $i < 6 && ($line = fgets($fh)) !== false; $i++) {
        $line = rtrim($line);
        if (preg_match('/^-- label: (.*)$/', $line, $m)) $meta['label'] = $m[1];
        if (preg_match('/^-- created: (.*)$/', $line, $m)) $meta['created'] = $m[1];
        if (preg_match('/^-- database: (.*)$/', $line, $m)) $meta['database'] = $m[1];
        if (preg_match('/^-- tables: (.*)$/', $line, $m)) $meta['tables'] = array_values(array_filter(explode(',', $m[1])));
    }
    fseek($fh, max(0, filesize($path) - 64));
    $meta['complete'] = strpos(stream_get_contents($fh), '@@CHECKPOINT-COMPLETE@@') !== false;
    fclose($fh);
    return $meta;
}

// Load a .sql checkpoint into the TEST database only.
function load_into_test($TEST, $path, $dropOthers){
    $conn = db_connect($TEST);
    if ($conn->query('SELECT DATABASE()')->fetch_row()[0] !== $TEST) throw new Exception('Safety stop: not connected to the test database.');
    $conn->query('SET FOREIGN_KEY_CHECKS = 0');
    if ($dropOthers) {
        foreach (base_tables($conn) as $t) $conn->query('DROP TABLE IF EXISTS `' . str_replace('`', '``', $t) . '`');
    }
    $fh = fopen($path, 'rb'); $buf = ''; $n = 0;
    while (($line = fgets($fh)) !== false) {
        if (rtrim($line) === '-- @@END-OF-STATEMENT@@') {
            $sql = trim(preg_replace('/^(\s*--[^\n]*\n)+/', '', $buf . "\n"));
            $buf = '';
            if ($sql !== '') { $conn->query($sql); $n++; }
            continue;
        }
        $buf .= $line;
    }
    fclose($fh);
    $conn->query('SET FOREIGN_KEY_CHECKS = 1');
    $conn->close();
    return $n;
}

function test_db_exists($TEST){
    $s = server_connect();
    $r = $s->query("SHOW DATABASES LIKE '" . $s->real_escape_string($TEST) . "'")->num_rows > 0;
    $s->close();
    return $r;
}
function set_test_cookie($key){
    setcookie(AARAMBH_TEST_COOKIE, $key, ['expires' => $key === '' ? time() - 3600 : time() + 30 * 86400, 'path' => '/', 'samesite' => 'Lax']);
    if ($key === '') unset($_COOKIE[AARAMBH_TEST_COOKIE]); else $_COOKIE[AARAMBH_TEST_COOKIE] = $key;
}

// ---- Actions ----
if (empty($_SESSION['te_token'])) $_SESSION['te_token'] = bin2hex(random_bytes(16));
$token = $_SESSION['te_token'];
$msg = ''; $err = '';
$keyFile = __DIR__ . '/test_mode_key.txt';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (!hash_equals($token, $_POST['token'] ?? '')) throw new Exception('This page was open too long — reload it and try again.');
        $action = $_POST['action'] ?? '';
        $pick = basename((string) ($_POST['file'] ?? ''));
        $path = $dir . '/' . $pick;

        if ($action === 'refresh') {
            if (trim($_POST['confirm'] ?? '') !== 'COPY') throw new Exception('Type COPY in the box to confirm.');
            $s = server_connect();
            $s->query('CREATE DATABASE IF NOT EXISTS `' . $TEST . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci');
            $s->close();
            $tmpFile = $dir . '/_live_copy.sql';
            [$t, $r] = dump_database($LIVE, $tmpFile, 'copy of real data');
            load_into_test($TEST, $tmpFile, true);
            unlink($tmpFile);
            if (aarambh_test_key() === '') file_put_contents($keyFile, bin2hex(random_bytes(12)));
            $status['copied_at'] = date('Y-m-d H:i:s'); $status['tables'] = $t; $status['rows'] = $r;
            save_status($statusFile, $status);
            $msg = "✓ The test copy now matches the real data as of " . $status['copied_at'] . " — $t tables, $r rows. The real database was only read, not changed.";
        } elseif ($action === 'enter') {
            if (!test_db_exists($TEST)) throw new Exception('Make the test copy first (step 1).');
            if (aarambh_test_key() === '') file_put_contents($keyFile, bin2hex(random_bytes(12)));
            set_test_cookie(aarambh_test_key());
            $msg = '🧪 This browser is now in TEST MODE. The portal will show an orange banner on every page. Nothing you save affects real school data.';
        } elseif ($action === 'leave') {
            set_test_cookie('');
            $msg = '✓ This browser has left test mode and is back on the REAL portal.';
        } elseif ($action === 'newkey') {
            file_put_contents($keyFile, bin2hex(random_bytes(12)));
            set_test_cookie('');
            $msg = '✓ New test key made. Every device that was in test mode is now back on the real portal; old join links no longer work.';
        } elseif ($action === 'save') {
            if (!test_db_exists($TEST)) throw new Exception('Make the test copy first (step 1).');
            $name = date('Y-m-d_H-i-s') . '__' . (preg_replace('/\s+/', '-', safe_label($_POST['label'] ?? '')) ?: 'test') . '.sql';
            [$t, $r] = dump_database($TEST, $dir . '/' . $name, $_POST['label'] ?? '');
            $msg = "✓ Test checkpoint saved — $t tables, $r rows.";
        } elseif ($action === 'reset') {
            if (!$pick || !is_file($path)) throw new Exception('Choose a checkpoint.');
            if (trim($_POST['confirm'] ?? '') !== 'RESET') throw new Exception('Type RESET in the box to confirm.');
            $meta = checkpoint_meta($path);
            if (!$meta['complete']) throw new Exception('That checkpoint is incomplete (it was interrupted while saving), so it was not used. Nothing was changed.');
            if ($meta['database'] !== $TEST) throw new Exception('That file is not a test checkpoint. Nothing was changed.');
            $safety = date('Y-m-d_H-i-s') . '__auto-before-reset.sql';
            dump_database($TEST, $dir . '/' . $safety, 'auto-before-reset');
            $n = load_into_test($TEST, $path, false);
            $msg = '✓ The TEST copy is back to “' . ($meta['label'] ?: $pick) . "”. Real school data was not touched. (The test state just before this reset was saved as “auto-before-reset” — reset to it to undo.)";
        } elseif ($action === 'delete') {
            if (!$pick || !is_file($path)) throw new Exception('Choose a checkpoint.');
            unlink($path);
            $msg = 'Checkpoint deleted.';
        }
    } catch (Throwable $e) {
        $err = $e->getMessage();
    }
    $_SESSION['te_flash'] = ['msg' => $msg, 'err' => $err, 'action' => $action ?? ''];
    header('Location: test_env.php', true, 303);
    exit;
}
$flash = $_SESSION['te_flash'] ?? null;
unset($_SESSION['te_flash']);
if ($flash) { $msg = $flash['msg']; $err = $flash['err']; }

$exists = test_db_exists($TEST);
$inTest = aarambh_is_test_request();
if ($flash && $flash['action'] === 'enter' && !$flash['err'] && !$inTest) {
    $msg = '';
    $err = 'This browser did not keep test mode (it may block cookies for localhost). Test mode is NOT on — you are still on the REAL portal. Check that cookies are allowed for localhost, then try again.';
}
$list = glob($dir . '/*.sql') ?: []; rsort($list);
$joinPath = '/aarambh-lms/backend/dev/test_mode_join.php?key=' . urlencode(aarambh_test_key());
?>
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Test environment</title>
<style>
 body{font-family:system-ui,Segoe UI,sans-serif; margin:24px; color:#0c0e0b; max-width:1000px;}
 .box{border:1px solid #d9dcd5; border-radius:10px; padding:16px 18px; margin:16px 0;}
 .btn{padding:8px 14px; border-radius:8px; border:none; background:#1f7a4d; color:#fff; font-weight:600; cursor:pointer;}
 .btn.orange{background:#c2410c;} .btn.red{background:#b3261e;} .btn.alt{background:#fff; color:#333; border:1px solid #bbb;}
 .ok{background:#e6f5e6; padding:12px 14px; border-radius:8px; font-weight:600;} .err{background:#fbe4e4; color:#a12727; padding:12px 14px; border-radius:8px; font-weight:600;}
 .pill{display:inline-block; padding:3px 10px; border-radius:99px; font-size:13px; font-weight:600;}
 table{border-collapse:collapse; width:100%; font-size:14px;} td,th{border-bottom:1px solid #e6e8e3; padding:8px; text-align:left;}
 input[type=text]{padding:7px 9px; border:1px solid #bbb; border-radius:6px;} code{background:#eef1ec; padding:2px 6px; border-radius:4px;} .dim{color:#777; font-size:13px;}
</style></head><body>
<h1>🧪 Test environment</h1>
<p>A separate copy of the database (<code><?= h($TEST) ?></code>) for testing. Resets here change <b>only the test copy</b> — the real database (<code><?= h($LIVE) ?></code>) that the schools use is never changed from this page.</p>
<?php if ($msg): ?><div class="ok"><?= h($msg) ?></div><?php endif; ?>
<?php if ($err): ?><div class="err">⚠ <?= h($err) ?></div><?php endif; ?>

<div class="box">
  <b>This browser:</b>
  <?= $inTest ? '<span class="pill" style="background:#ffedd5;color:#c2410c;">🧪 TEST MODE — using the test copy</span>' : '<span class="pill" style="background:#e6f5e6;color:#1f7a4d;">REAL portal — real school data</span>' ?>
  <span class="dim">(checked just now from this browser)</span>
  &nbsp; <b>Test copy:</b> <?= $exists ? 'made' . (!empty($status['copied_at']) ? ' from real data on ' . h($status['copied_at']) : '') : '<span style="color:#b3261e;">not made yet</span>' ?>
</div>

<div class="box">
  <h3 style="margin-top:0;">1 · Make / refresh the test copy from the real data</h3>
  <p class="dim">Copies every table from the real database into the test copy, replacing whatever is in the test copy. The real data is only read. Do this at the start, and whenever you want fresh data to test on.</p>
  <form method="post" onsubmit="return confirm('Replace the TEST copy with a fresh copy of the real data?\n\nThe real database is not changed. Everything currently in the test copy is replaced.');">
    <input type="hidden" name="token" value="<?= h($token) ?>"><input type="hidden" name="action" value="refresh">
    <input type="text" name="confirm" placeholder="type COPY" style="width:110px;"> <button class="btn">Copy real data into the test copy</button>
  </form>
</div>

<div class="box">
  <h3 style="margin-top:0;">2 · Test mode on/off</h3>
  <?php if (!$inTest): ?>
  <form method="post" style="display:inline;" onsubmit="return confirm('Switch THIS browser to TEST MODE?\n\nThe portal in this browser will use the test copy, and show an orange TEST MODE banner on every page. Other people and devices are not affected.');">
    <input type="hidden" name="token" value="<?= h($token) ?>"><input type="hidden" name="action" value="enter">
    <button class="btn orange" <?= $exists ? '' : 'disabled' ?>>🧪 Put this browser in test mode</button>
  </form>
  <?php else: ?>
  <form method="post" style="display:inline;" onsubmit="return confirm('Leave test mode?\n\nThis browser goes back to the REAL portal — anything saved after this goes into real school data.');">
    <input type="hidden" name="token" value="<?= h($token) ?>"><input type="hidden" name="action" value="leave">
    <button class="btn">Leave test mode (back to the real portal)</button>
  </form>
  <?php endif; ?>
  <?php if ($exists && aarambh_test_key() !== ''): ?>
  <p style="margin:14px 0 4px;"><b>Test on a phone or another computer:</b> open this link there (put your ngrok address in front):</p>
  <p><code>https://dork-greeting-legibly.ngrok-free.dev<?= h($joinPath) ?></code></p>
  <p class="dim">To leave test mode on that device, open the same page with <code>&amp;leave=1</code> added, or use the "Leave test mode" button in the orange banner.</p>
  <form method="post" onsubmit="return confirm('Make a new test key?\n\nEVERY device in test mode goes back to the real portal, and old join links stop working.');">
    <input type="hidden" name="token" value="<?= h($token) ?>"><input type="hidden" name="action" value="newkey">
    <button class="btn alt">Take all devices out of test mode (new key)</button>
  </form>
  <?php endif; ?>
</div>

<div class="box">
  <h3 style="margin-top:0;">3 · Test checkpoints — save and reset the TEST copy</h3>
  <form method="post">
    <input type="hidden" name="token" value="<?= h($token) ?>"><input type="hidden" name="action" value="save">
    <input type="text" name="label" placeholder="e.g. before import test" maxlength="40" style="width:280px;"> <button class="btn" <?= $exists ? '' : 'disabled' ?>>Save test checkpoint</button>
  </form>
  <?php if ($list): ?>
  <table style="margin-top:12px;"><tr><th>Checkpoint</th><th>Saved</th><th>Size</th><th></th></tr>
  <?php foreach ($list as $f): $m = checkpoint_meta($f); $usable = $m['complete'] && $m['database'] === $TEST; ?>
    <tr>
      <td><b><?= h($m['label'] ?: '(no label)') ?></b><?= $usable ? '' : ' <span style="color:#b3261e;">— cannot be used</span>' ?></td>
      <td><?= h($m['created']) ?></td>
      <td><?= number_format(filesize($f) / 1048576, 2) ?> MB</td>
      <td style="white-space:nowrap;">
        <form method="post" style="display:inline;" onsubmit="return confirm('Reset the TEST copy to “<?= h($m['label'] ?: basename($f)) ?>”?\n\nOnly the test copy changes — real school data is not touched. The current test state is saved first so you can undo.');">
          <input type="hidden" name="token" value="<?= h($token) ?>"><input type="hidden" name="action" value="reset"><input type="hidden" name="file" value="<?= h(basename($f)) ?>">
          <input type="text" name="confirm" placeholder="type RESET" style="width:95px;" <?= $usable ? '' : 'disabled' ?>> <button class="btn red" <?= $usable ? '' : 'disabled' ?>>Reset test copy</button>
        </form>
        <form method="post" style="display:inline;" onsubmit="return confirm('Delete this test checkpoint?');">
          <input type="hidden" name="token" value="<?= h($token) ?>"><input type="hidden" name="action" value="delete"><input type="hidden" name="file" value="<?= h(basename($f)) ?>">
          <button class="btn alt">Delete</button>
        </form>
      </td>
    </tr>
  <?php endforeach; ?></table>
  <?php else: ?><p class="dim">No test checkpoints yet.</p><?php endif; ?>
</div>
</body></html>