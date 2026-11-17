<?php
// =========================================================================
// JOIN TEST MODE — opened from the link shown on backend/dev/test_env.php,
// so a phone or another computer (through the ngrok link) can test on the
// test copy too. Only works with the current test key.
// File: backend/dev/test_mode_join.php?key=…   (&leave=1 to leave)
// =========================================================================
require_once __DIR__ . '/test_env_switch.php';
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
$key = aarambh_test_key();
$given = (string) ($_GET['key'] ?? '');
$leave = isset($_GET['leave']);
$cookieOpts = ['expires' => time() + 30 * 86400, 'path' => '/', 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS']) || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'];
if ($leave) {
    setcookie(AARAMBH_TEST_COOKIE, '', ['expires' => time() - 3600] + $cookieOpts);
    $ok = true; $title = 'You have left test mode'; $text = 'This browser is back on the REAL portal. Everything you do now is saved to the real school data.'; $color = '#1f7a4d';
} elseif ($key !== '' && $given !== '' && hash_equals($key, $given)) {
    setcookie(AARAMBH_TEST_COOKIE, $key, $cookieOpts);
    $ok = true; $title = '🧪 Test mode is ON for this browser'; $text = 'This browser now uses the TEST copy of the database. Anything you save here does not touch real school data. An orange banner will show on every page while test mode is on.'; $color = '#c2410c';
} else {
    $ok = false; $title = 'This test link is not valid'; $text = 'The link is old or incomplete. Ask for a new one from the test page on the XAMPP computer. This browser stays on the REAL portal.'; $color = '#b3261e';
}
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title><?= htmlspecialchars($title) ?></title></head>
<body style="font-family:system-ui,Segoe UI,sans-serif; margin:0; display:flex; min-height:100vh; align-items:center; justify-content:center; background:#f4f4f1;">
  <div style="max-width:460px; margin:20px; background:#fff; border-radius:14px; padding:26px; border-top:6px solid <?= $color ?>; box-shadow:0 4px 18px rgba(0,0,0,.08);">
    <h2 style="margin:0 0 10px; color:<?= $color ?>;"><?= htmlspecialchars($title) ?></h2>
    <p style="line-height:1.5; margin:0 0 18px;"><?= htmlspecialchars($text) ?></p>
    <a href="../../index.html" style="display:inline-block; padding:10px 18px; border-radius:8px; background:<?= $color ?>; color:#fff; text-decoration:none; font-weight:600;">Open the portal</a>
  </div>
</body></html>
