<?php
// Ends the signed-in session on the server, clears its cookie, then returns to the login page.
session_start();
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
}
session_destroy();
header('Location: ../../index.html?logged_out=1', true, 302);
exit;
