<?php
// =========================================================================
// APPROVE EFFECTIVE — Supervisor-side. Records her decision (approve or
// reject) on a specific effective_approvals row. This is the only
// thing that can move a submission out of 'pending' — the teacher's
// own screen has no way to do this to herself.
//
// Same mysqli connection pattern as get_my_class.php.
// =========================================================================

session_start();
header('Content-Type: application/json');

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'supervisor') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?? [];

$approvalId = filter_var($input['approval_id'] ?? null, FILTER_VALIDATE_INT);
$decision   = $input['decision'] ?? null; // 'approved' | 'rejected'
$note       = trim((string)($input['note'] ?? ''));

if ($approvalId === false || $approvalId === null || !in_array($decision, ['approved', 'rejected'], true)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing or invalid fields.']);
    exit;
}

if ($decision === 'rejected' && $note === '') {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'A note is required when rejecting, so the teacher knows what to fix.']);
    exit;
}

if (isset($_SESSION['user_id'])) {
    $supervisorUserId = $_SESSION['user_id'];
} else {
    // Dev-mode bypass has no real user_id — null is fine here (the
    // column allows it) since there's no real supervisor account to
    // attribute this to locally.
    $supervisorUserId = null;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$stmt = $conn->prepare(
    'UPDATE effective_approvals
     SET status = ?, supervisor_user_id = ?, supervisor_note = ?, decided_at = NOW()
     WHERE id = ? AND status = "pending"'
);
$stmt->bind_param('sisi', $decision, $supervisorUserId, $note, $approvalId);
$ok = $stmt->execute();
$affected = $stmt->affected_rows;

$stmt->close();
$conn->close();

if (!$ok) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Could not save the decision.']);
    exit;
}

if ($affected === 0) {
    // Either the id doesn't exist, or someone else already decided it
    // (e.g. two supervisor tabs open) — not a server error, just
    // nothing left to do.
    echo json_encode(['status' => 'error', 'message' => 'This submission was already decided or no longer exists.']);
    exit;
}

echo json_encode(['status' => 'success']);
?>