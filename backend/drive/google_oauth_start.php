<?php
// =========================================================================
// GOOGLE OAUTH START — the teacher's dashboard links a "Connect Google
// Drive" button to this file. It doesn't do any work itself — it just
// builds Google's consent-screen URL and redirects her there.
//
// scope=drive.file (not full Drive access) — this app can only see
// files it creates itself, never anything else in her Drive. Matters
// for Google's app-verification review: drive.file usually doesn't
// trigger the "sensitive scopes" review that broader scopes do.
//
// access_type=offline + prompt=consent together are what make Google
// actually issue a refresh_token — without both, a second connection
// attempt from the same Google account silently returns no
// refresh_token at all, and uploads would stop working silently after
// the first access_token expires.
// =========================================================================

session_start();
require_once __DIR__ . '/google_oauth_config.php';

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'teacher') {
    http_response_code(401);
    echo 'Not authorized.';
    exit;
}

// WHO is connecting: the logged-in teacher only. On the server computer
// (localhost) with ?dev_role=teacher, test teacher 49. Anyone else is
// refused — never a guessed teacher.
$requestIsLocal = in_array($requestHost, ['localhost', '127.0.0.1'], true);
if (isset($_SESSION['user_id']) && (int) $_SESSION['user_id'] > 0) {
    $teacherUserId = (int) $_SESSION['user_id'];
} elseif ($requestIsLocal && isset($_GET['dev_role'])) {
    $teacherUserId = 49;
} else {
    http_response_code(401);
    echo 'Please log in again.';
    exit;
}

// state is a one-time random code, kept in THIS browser's session along
// with the teacher's ID. The callback only accepts Google's reply if the
// code comes back unchanged — so nobody can edit the address and attach
// their own Google Drive to another teacher's account.
$oauthNonce = bin2hex(random_bytes(16));
$_SESSION['google_oauth_state'] = [
    'nonce'   => $oauthNonce,
    'teacher' => $teacherUserId,
    'at'      => time(),
];

$params = http_build_query([
    'client_id'     => GOOGLE_CLIENT_ID,
    'redirect_uri'  => GOOGLE_REDIRECT_URI,
    'response_type' => 'code',
    'scope'         => 'https://www.googleapis.com/auth/drive.file',
    'access_type'   => 'offline',
    'prompt'        => 'consent',
    'state'         => $oauthNonce,
]);

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $params);
exit;