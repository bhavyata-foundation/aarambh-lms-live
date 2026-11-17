<?php
// =========================================================================
// GOOGLE OAUTH CALLBACK — Google sends the teacher's browser here after
// she approves (or denies) access, with a one-time ?code= in the URL.
// This exchanges that code for a real access_token + refresh_token via
// a server-to-server call to Google (the code itself is useless without
// also proving we hold the Client Secret), then saves them.
//
// Same mysqli connection pattern as get_my_class.php.
// =========================================================================

session_start();
require_once __DIR__ . '/google_oauth_config.php';
require_once __DIR__ . '/../users/db_config.php';

if (isset($_GET['error'])) {
    // She clicked "Cancel" on Google's consent screen, or something
    // else went wrong on Google's side.
    header('Location: /aarambh-lms/teacher.html?drive_connected=0&reason=' . urlencode($_GET['error']));
    exit;
}

if (!isset($_GET['code'])) {
    http_response_code(400);
    echo 'No authorization code received from Google.';
    exit;
}

// WHO this connection belongs to: the teacher who pressed "Connect" in
// THIS browser. google_oauth_start.php kept a one-time code and her ID
// in the session; Google hands the code back as ?state=. If it doesn't
// match (or is over 15 minutes old) the connection is refused, so the
// teacher can never be chosen by editing the address.
$saved = $_SESSION['google_oauth_state'] ?? null;
unset($_SESSION['google_oauth_state']); // one use only
$returnedState = (string) ($_GET['state'] ?? '');
if (
    !is_array($saved) ||
    empty($saved['nonce']) ||
    !hash_equals((string) $saved['nonce'], $returnedState) ||
    (time() - (int) ($saved['at'] ?? 0)) > 900
) {
    http_response_code(400);
    echo 'This Google Drive connection could not be confirmed. Please go back to the portal (using the ngrok address), log in, and press "Connect Google Drive" again.';
    exit;
}
$teacherUserId = (int) $saved['teacher'];
if ($teacherUserId <= 0) {
    http_response_code(400);
    echo 'Could not determine which teacher this connection belongs to.';
    exit;
}

$ch = curl_init('https://oauth2.googleapis.com/token');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'code'          => $_GET['code'],
    'client_id'     => GOOGLE_CLIENT_ID,
    'client_secret' => GOOGLE_CLIENT_SECRET,
    'redirect_uri'  => GOOGLE_REDIRECT_URI,
    'grant_type'    => 'authorization_code',
]));
$response = curl_exec($ch);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo 'Could not reach Google: ' . htmlspecialchars($curlError);
    exit;
}

$tokenData = json_decode($response, true);

if (!isset($tokenData['access_token'])) {
    http_response_code(500);
    echo 'Google did not return an access token. Raw response: ' . htmlspecialchars($response);
    exit;
}

$accessToken  = $tokenData['access_token'];
$refreshToken = $tokenData['refresh_token'] ?? null; // present on first consent, or any consent with prompt=consent
$expiresAt    = date('Y-m-d H:i:s', time() + ($tokenData['expires_in'] ?? 3600));

$conn = get_db_connection();

if ($refreshToken) {
    // First-time connection (or a forced re-consent) — save both tokens.
    $stmt = $conn->prepare(
        'INSERT INTO google_drive_tokens (teacher_user_id, access_token, refresh_token, expires_at, updated_at)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
            access_token = VALUES(access_token),
            refresh_token = VALUES(refresh_token),
            expires_at = VALUES(expires_at),
            updated_at = NOW()'
    );
    $stmt->bind_param('isss', $teacherUserId, $accessToken, $refreshToken, $expiresAt);
} else {
    // Re-connecting with an existing refresh_token already on file —
    // Google doesn't re-issue it, so only update the access_token.
    $stmt = $conn->prepare(
        'UPDATE google_drive_tokens SET access_token = ?, expires_at = ?, updated_at = NOW() WHERE teacher_user_id = ?'
    );
    $stmt->bind_param('ssi', $accessToken, $expiresAt, $teacherUserId);
}
$stmt->execute();
$stmt->close();
$conn->close();

header('Location: /aarambh-lms/teacher.html?drive_connected=1');
exit;