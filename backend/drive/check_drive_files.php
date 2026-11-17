<?php
// =========================================================================
// CHECK DRIVE FILES — given a list of Drive file IDs the app has
// stored references to, returns which ones still actually exist and
// aren't trashed. Used to catch the case where someone deleted a file
// directly in Google Drive (outside the app) — without this, the app
// would keep showing a link to something that's gone.
//
// Same token-refresh logic as upload_to_drive.php, same mysqli
// connection pattern as get_my_class.php.
// =========================================================================

session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/google_oauth_config.php';
require_once __DIR__ . '/../users/db_config.php';

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'teacher') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}

$teacherUserId = $_SESSION['user_id'] ?? ($devRole ? 49 : null);
if (!$teacherUserId) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Could not determine which teacher this is.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$fileIds = is_array($input['file_ids'] ?? null) ? array_values(array_unique(array_filter($input['file_ids']))) : [];
if (!$fileIds) {
    echo json_encode(['status' => 'success', 'existing' => []]);
    exit;
}

$conn = get_db_connection();
$stmt = $conn->prepare('SELECT access_token, refresh_token, expires_at FROM google_drive_tokens WHERE teacher_user_id = ?');
$stmt->bind_param('i', $teacherUserId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    // Not connected — can't check anything, but that's not really an
    // error here: just report nothing as confirmed-existing, and let
    // the frontend decide what to do (it currently just skips pruning
    // when the check itself fails, rather than assuming deleted).
    echo json_encode(['status' => 'error', 'message' => 'Google Drive isn\'t connected for this account.']);
    exit;
}

$accessToken = $row['access_token'];
if (strtotime($row['expires_at']) <= time() + 60) {
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'client_id'     => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'refresh_token' => $row['refresh_token'],
        'grant_type'    => 'refresh_token',
    ]));
    $refreshResp = curl_exec($ch);
    curl_close($ch);
    $refreshData = json_decode($refreshResp, true);
    if (isset($refreshData['access_token'])) {
        $accessToken = $refreshData['access_token'];
        $newExpiresAt = date('Y-m-d H:i:s', time() + ($refreshData['expires_in'] ?? 3600));
        $upd = $conn->prepare('UPDATE google_drive_tokens SET access_token = ?, expires_at = ?, updated_at = NOW() WHERE teacher_user_id = ?');
        $upd->bind_param('ssi', $accessToken, $newExpiresAt, $teacherUserId);
        $upd->execute();
        $upd->close();
    }
}
$conn->close();

$existing = [];
foreach ($fileIds as $fileId) {
    $ch = curl_init('https://www.googleapis.com/drive/v3/files/' . urlencode($fileId) . '?fields=id,trashed');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode === 200) {
        $data = json_decode($resp, true);
        if (empty($data['trashed'])) {
            $existing[] = $fileId; // still there, not trashed
        }
        // trashed=true → treated as gone, not added to $existing
    }
    // Any other status (404 = deleted, 401/403 = permission issue,
    // etc.) also just isn't added to $existing — the frontend prunes
    // based on absence, not on a specific error code.
}

echo json_encode(['status' => 'success', 'existing' => $existing]);