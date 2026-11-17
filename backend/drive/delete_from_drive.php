<?php
// =========================================================================
// DELETE FROM DRIVE — removes a file from the teacher's connected
// Drive when she removes evidence in the app. Without this, "Remove"
// in the UI would just hide the reference while the actual file sat
// there forever, slowly cluttering her real Drive.
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
$fileId = trim((string)($input['file_id'] ?? ''));
if ($fileId === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing file_id.']);
    exit;
}

$conn = get_db_connection();
$stmt = $conn->prepare('SELECT access_token, refresh_token, expires_at FROM google_drive_tokens WHERE teacher_user_id = ?');
$stmt->bind_param('i', $teacherUserId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
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

$ch = curl_init('https://www.googleapis.com/drive/v3/files/' . urlencode($fileId));
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// 204 = deleted. 404 = already gone (someone deleted it manually in
// Drive) — treat that as success too, since the end state the app
// cares about (file no longer exists) is the same either way.
if ($httpCode === 204 || $httpCode === 404) {
    echo json_encode(['status' => 'success']);
} else {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not delete the file from Drive (HTTP ' . $httpCode . ').']);
}