<?php
// TEMPORARY diagnostic — upload, open in the same browser after logging in, send the output, then DELETE this file.
ob_start();
$started = session_start();                       // first thing, before any output
$err = error_get_last();
ob_end_clean();
header('Content-Type: text/plain; charset=utf-8');
echo "session_start returned: " . var_export($started, true) . "\n";
echo "session_id: " . session_id() . "\n";
echo "session_status: " . session_status() . " (2 = active)\n";
echo "last PHP error: " . ($err ? $err['message'] : '(none)') . "\n";
echo "browser sent session cookie: " . (isset($_COOKIE[session_name()]) ? 'yes' : 'NO') . "\n";
echo "user_id in session: " . ($_SESSION['user_id'] ?? 'NONE') . "\n";
echo "role in session: " . ($_SESSION['role'] ?? 'NONE') . "\n";
echo "visit counter (should go UP on each refresh if sessions persist): ";
$_SESSION['visits'] = ($_SESSION['visits'] ?? 0) + 1;
echo $_SESSION['visits'] . "\n";