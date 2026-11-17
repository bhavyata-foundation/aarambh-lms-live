<?php
// =========================================================================
// UPLOAD TO DRIVE — the real replacement for "open Drive, paste link
// back". Takes a file the teacher selects, uploads it directly into
// HER OWN connected Google Drive (using the tokens saved by
// google_oauth_callback.php), into an organized folder structure, and
// returns a link back to the frontend.
//
// FOLDER STRUCTURE: every upload lands under one root folder,
// "Aarambh LMS", so a teacher's Drive doesn't end up cluttered with
// loose files at the top level. An optional folder_path field (e.g.
// "Weekly Activities/2026-09-08" or "Classroom State/September 2026")
// nests further under that root — each segment is found-or-created on
// Drive, so the very first upload of the day creates that day's
// folder, and every later upload that same day reuses it.
//
// Access tokens expire ~hourly. This checks expires_at and silently
// refreshes using the saved refresh_token when needed — the teacher
// never has to reconnect for this, only if she revokes access on
// Google's side or the refresh_token itself stops working.
//
// FIXED: every curl call here now has an explicit connect/total
// timeout. Without one, a slow or dropped connection to Google left
// PHP waiting indefinitely — the request would just sit at "pending"
// in the browser forever with no error, no matter how patiently you
// waited. Now a genuinely unreachable network fails within ~15s with
// a real, visible error instead.
//
// PRIVACY DECISION LEFT OPEN ON PURPOSE: this does NOT make the
// uploaded file link-shareable ("anyone with the link can view").
// Right now the returned link only opens for the teacher's own
// Google account — safer default given these are often photos of
// children, but it means she'd need to explicitly share the file
// herself if someone else (a supervisor, a parent) needs to see it.
// If you want uploads to be link-shareable automatically instead,
// that's a different, deliberate privacy trade-off — say so and I'll
// add the permissions call that does it.
//
// Same mysqli connection pattern as get_my_class.php.
// =========================================================================

session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/google_oauth_config.php';
require_once __DIR__ . '/../users/db_config.php';

// Every curl call in this file gets these same two timeouts — a short
// connect timeout (is Google even reachable right now) and a longer
// total timeout (give a slow-but-working connection a real chance,
// especially for the actual file upload, which is naturally slower
// than a metadata call).
const DRIVE_CONNECT_TIMEOUT = 8;
const DRIVE_TOTAL_TIMEOUT = 20;
function applyDriveTimeouts($ch, $totalTimeout = DRIVE_TOTAL_TIMEOUT){
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, DRIVE_CONNECT_TIMEOUT);
    curl_setopt($ch, CURLOPT_TIMEOUT, $totalTimeout);
}

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

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No file uploaded, or the upload failed.']);
    exit;
}

// folder_path arrives as a regular POST field alongside the file
// (multipart/form-data), not JSON — this request is a file upload.
$folderPath = trim((string)($_POST['folder_path'] ?? ''));

$conn = get_db_connection();

$stmt = $conn->prepare('SELECT access_token, refresh_token, expires_at FROM google_drive_tokens WHERE teacher_user_id = ?');
$stmt->bind_param('i', $teacherUserId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    echo json_encode(['status' => 'error', 'message' => 'Google Drive isn\'t connected yet for this account. Visit backend/google_oauth_start.php first.']);
    exit;
}

$accessToken = $row['access_token'];

// Refresh if expired or expiring within the next minute — better to
// refresh a little early than have the upload itself fail partway.
if (strtotime($row['expires_at']) <= time() + 60) {
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    applyDriveTimeouts($ch);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'client_id'     => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'refresh_token' => $row['refresh_token'],
        'grant_type'    => 'refresh_token',
    ]));
    $refreshResp = curl_exec($ch);
    $refreshErr = curl_error($ch);
    curl_close($ch);

    if ($refreshErr) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Could not reach Google to refresh Drive access: ' . $refreshErr]);
        exit;
    }

    $refreshData = json_decode($refreshResp, true);
    if (!isset($refreshData['access_token'])) {
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Could not refresh Google Drive access — she may need to reconnect via google_oauth_start.php.']);
        exit;
    }

    $accessToken = $refreshData['access_token'];
    $newExpiresAt = date('Y-m-d H:i:s', time() + ($refreshData['expires_in'] ?? 3600));
    $upd = $conn->prepare('UPDATE google_drive_tokens SET access_token = ?, expires_at = ?, updated_at = NOW() WHERE teacher_user_id = ?');
    $upd->bind_param('ssi', $accessToken, $newExpiresAt, $teacherUserId);
    $upd->execute();
    $upd->close();
}
$conn->close();

// =========================================================================
// Folder resolution — find a folder by name under a given parent, or
// create it if it doesn't exist yet. Searching before creating means
// the second upload to the same day's folder reuses it instead of
// making a duplicate "2026-09-08" folder next to the first one.
// =========================================================================
function driveFindOrCreateFolder($accessToken, $name, $parentId, &$debugLog){
    $escapedName = str_replace("'", "\\'", $name);
    $query = "mimeType='application/vnd.google-apps.folder' and name='{$escapedName}' and '{$parentId}' in parents and trashed=false";

    $ch = curl_init('https://www.googleapis.com/drive/v3/files?' . http_build_query([
        'q' => $query,
        'fields' => 'files(id,name)',
        'spaces' => 'drive',
    ]));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
    applyDriveTimeouts($ch);
    $searchResp = curl_exec($ch);
    $searchErr = curl_error($ch);
    curl_close($ch);

    if ($searchErr) {
        $debugLog[] = "Search for '{$name}' could not reach Google: {$searchErr}";
        return null;
    }
    $searchData = json_decode($searchResp, true);

    if (!empty($searchData['files'][0]['id'])) {
        return $searchData['files'][0]['id']; // already exists — reuse it
    }
    if (isset($searchData['error'])) {
        $debugLog[] = "Search for '{$name}' failed: " . json_encode($searchData['error']);
        return null;
    }

    // Not found — create it.
    $ch = curl_init('https://www.googleapis.com/drive/v3/files?fields=id');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json',
    ]);
    applyDriveTimeouts($ch);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
        'name' => $name,
        'mimeType' => 'application/vnd.google-apps.folder',
        'parents' => [$parentId],
    ]));
    $createResp = curl_exec($ch);
    $createErr = curl_error($ch);
    curl_close($ch);

    if ($createErr) {
        $debugLog[] = "Create '{$name}' could not reach Google: {$createErr}";
        return null;
    }
    $createData = json_decode($createResp, true);

    if (!isset($createData['id'])) {
        $debugLog[] = "Create '{$name}' failed: " . json_encode($createData);
        return null;
    }

    return $createData['id'];
}

// Walks "Weekly Activities/2026-09-08" down from Drive root, creating
// each level that doesn't exist yet, and returns the final (deepest)
// folder's id — that's where the actual file gets uploaded.
function driveResolveFolderPath($accessToken, $rootFolderName, $subPath, &$debugLog){
    $currentParent = driveFindOrCreateFolder($accessToken, $rootFolderName, 'root', $debugLog);
    if (!$currentParent) return null;

    if ($subPath !== '') {
        $segments = array_filter(array_map('trim', explode('/', $subPath)), fn($s) => $s !== '');
        foreach ($segments as $segment) {
            $currentParent = driveFindOrCreateFolder($accessToken, $segment, $currentParent, $debugLog);
            if (!$currentParent) return null;
        }
    }

    return $currentParent;
}

$targetFolderId = null;
$folderDebugLog = [];

// Serialize folder resolution per-teacher — without this, two nearly-
// simultaneous uploads (e.g. evidence going to two different domain
// folders at once) can both check "does today's folder exist?", both
// see "no" at the same instant, and both create it — producing exact
// duplicate folders, which is exactly what happened before this lock
// existed. flock() on a per-teacher lock file makes the second
// request wait for the first to finish resolving/creating folders
// before it even starts looking, so it always finds what the first
// one just made instead of racing it.
$lockDir = sys_get_temp_dir();
$lockFile = $lockDir . '/aarambh_drive_folder_lock_' . $teacherUserId . '.lock';
$lockHandle = fopen($lockFile, 'c');
if ($lockHandle && flock($lockHandle, LOCK_EX)) {
    $targetFolderId = driveResolveFolderPath($accessToken, 'Aarambh LMS', $folderPath, $folderDebugLog);
    flock($lockHandle, LOCK_UN);
    fclose($lockHandle);
} else {
    if ($lockHandle) fclose($lockHandle);
    // Could not acquire the lock (very rare) — fall back to resolving
    // without it rather than failing the whole upload outright.
    $targetFolderId = driveResolveFolderPath($accessToken, 'Aarambh LMS', $folderPath, $folderDebugLog);
}

if (!$targetFolderId) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not create or find the destination folder in Drive.', 'debug' => $folderDebugLog]);
    exit;
}

// Build a multipart/related request by hand — this is what the Drive
// API's simple upload endpoint expects: a JSON metadata part (the
// filename + parent folder) followed by the actual file bytes,
// separated by a boundary string. No external library needed for this.
$fileName = basename($_FILES['file']['name']);
$mimeType = $_FILES['file']['type'] ?: 'application/octet-stream';
$fileContent = file_get_contents($_FILES['file']['tmp_name']);
$boundary = '-------314159265358979323846';

$body = "--{$boundary}\r\n"
    . "Content-Type: application/json; charset=UTF-8\r\n\r\n"
    . json_encode(['name' => $fileName, 'parents' => [$targetFolderId]]) . "\r\n"
    . "--{$boundary}\r\n"
    . "Content-Type: {$mimeType}\r\n\r\n"
    . $fileContent . "\r\n"
    . "--{$boundary}--";

$ch = curl_init('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $accessToken,
    'Content-Type: multipart/related; boundary=' . $boundary,
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
// The actual file upload gets a longer total timeout than the small
// metadata calls above — a real photo can take longer than 20s on a
// slow connection, and that shouldn't be treated the same as a fully
// dead connection.
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, DRIVE_CONNECT_TIMEOUT);
curl_setopt($ch, CURLOPT_TIMEOUT, 45);
$uploadResp = curl_exec($ch);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not reach Google Drive: ' . $curlError]);
    exit;
}

$uploadData = json_decode($uploadResp, true);
if (!isset($uploadData['id'])) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Drive upload failed.', 'raw' => $uploadResp]);
    exit;
}

echo json_encode([
    'status' => 'success',
    'file_id' => $uploadData['id'],
    'link' => $uploadData['webViewLink'] ?? ('https://drive.google.com/file/d/' . $uploadData['id'] . '/view'),
]);