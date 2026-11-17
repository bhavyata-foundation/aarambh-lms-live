<?php
// =========================================================================
// MANAGE SUPERVISOR ACCOUNTS
// -------------------------------------------------------------------------
// A real, reusable admin page — create or delete as many supervisor
// accounts as you need, without writing a new one-off script each
// time. Gated to superadmin only (same real session check every other
// role-restricted page in this app uses), so this can safely stay on
// the server, unlike the earlier one-time create_supervisor_account
// scripts, which needed deleting after use precisely because they had
// no such gate.
//
// File: backend/auth/manage_supervisors.php
// =========================================================================

session_start();

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'superadmin') {
    http_response_code(401);
    echo '<p style="font-family:sans-serif; padding:40px;">Not authorized. Log in as Super Admin first, then open this page.</p>';
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

$message = '';
$messageType = ''; // 'success' | 'error'

// -------------------------------------------------------------------------
// HANDLE ACTIONS
// -------------------------------------------------------------------------

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $action = $_POST['action'] ?? '';

    if ($action === 'create') {
        $name = trim($_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $password = $_POST['password'] ?? '';

        if ($name === '' || $email === '' || $password === '') {
            $message = 'Name, email, and password are all required.';
            $messageType = 'error';
        } elseif (strlen($password) < 6) {
            $message = 'Password must be at least 6 characters.';
            $messageType = 'error';
        } else {
            $check = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
            $check->bind_param('s', $email);
            $check->execute();
            if ($check->get_result()->fetch_assoc()) {
                $message = 'An account with this email already exists.';
                $messageType = 'error';
            } else {
                $passwordHash = password_hash($password, PASSWORD_DEFAULT);
                $role = 'supervisor';
                $stmt = $conn->prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
                $stmt->bind_param('ssss', $name, $email, $passwordHash, $role);
                if ($stmt->execute()) {
                    $message = "Created supervisor account for $name ($email).";
                    $messageType = 'success';
                } else {
                    $message = 'Could not create the account: ' . $stmt->error;
                    $messageType = 'error';
                }
                $stmt->close();
            }
            $check->close();
        }
    }

    if ($action === 'delete') {
        $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT);
        if ($id) {
            // Only ever deletes a real supervisor row — this can't be used
            // to delete a teacher/superadmin account by guessing an id,
            // even if someone tampered with the hidden form field.
            $stmt = $conn->prepare("DELETE FROM users WHERE id = ? AND role = 'supervisor'");
            $stmt->bind_param('i', $id);
            $stmt->execute();
            if ($stmt->affected_rows > 0) {
                $message = 'Supervisor account deleted.';
                $messageType = 'success';
            } else {
                $message = 'Could not find that supervisor account.';
                $messageType = 'error';
            }
            $stmt->close();
        }
    }
}

// -------------------------------------------------------------------------
// LOAD CURRENT LIST
// -------------------------------------------------------------------------

$supervisors = [];
$result = $conn->query("SELECT id, name, email FROM users WHERE role = 'supervisor' ORDER BY name");
while ($row = $result->fetch_assoc()) {
    $supervisors[] = $row;
}

$conn->close();

function h($s) { return htmlspecialchars($s ?? '', ENT_QUOTES, 'UTF-8'); }
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Manage Supervisor Accounts</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: #f4f4f2; margin: 0; padding: 30px; color: #222; }
  .wrap { max-width: 640px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 6px; }
  p.sub { color: #777; font-size: 13px; margin: 0 0 24px; }
  .card { background: #fff; border: 1px solid #e2e2de; border-radius: 10px; padding: 20px 22px; margin-bottom: 20px; }
  .card h2 { font-size: 14px; margin: 0 0 14px; }
  label { display: block; font-size: 12px; font-weight: 600; color: #666; margin: 12px 0 4px; }
  input[type=text], input[type=email], input[type=password] {
    width: 100%; padding: 9px 10px; border: 1px solid #ccc; border-radius: 7px; font-size: 14px; box-sizing: border-box;
  }
  button {
    padding: 9px 18px; border-radius: 7px; border: none; background: #25993c; color: #fff;
    font-size: 13px; font-weight: 600; cursor: pointer; margin-top: 16px;
  }
  button.danger { background: #fff; color: #c8433f; border: 1px solid #c8433f; padding: 5px 12px; font-size: 12px; margin-top: 0; }
  .row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
  .row:last-child { border-bottom: none; }
  .msg { padding: 10px 14px; border-radius: 8px; margin-bottom: 18px; font-size: 13px; }
  .msg.success { background: #e8f5ea; color: #1a7431; }
  .msg.error { background: #fdeceb; color: #c8433f; }
  .empty { color: #999; font-size: 13px; padding: 6px 0; }
</style>
</head>
<body>
<div class="wrap">

  <h1>Manage Supervisor Accounts</h1>
  <p class="sub">Create or remove as many real supervisor logins as you need — this page can stay on the server, unlike a one-time script, since it's gated to Super Admin.</p>

  <?php if ($message): ?>
    <div class="msg <?= h($messageType) ?>"><?= h($message) ?></div>
  <?php endif; ?>

  <div class="card">
    <h2>Existing supervisors (<?= count($supervisors) ?>)</h2>
    <?php if (!$supervisors): ?>
      <p class="empty">No supervisor accounts yet — add one below.</p>
    <?php else: ?>
      <?php foreach ($supervisors as $s): ?>
        <div class="row">
          <div>
            <b><?= h($s['name']) ?></b><br>
            <span style="color:#888; font-size:12.5px;"><?= h($s['email']) ?></span>
          </div>
          <form method="POST" onsubmit="return confirm('Delete this supervisor account? This cannot be undone.');" style="margin:0;">
            <input type="hidden" name="action" value="delete">
            <input type="hidden" name="id" value="<?= (int)$s['id'] ?>">
            <button type="submit" class="danger">Delete</button>
          </form>
        </div>
      <?php endforeach; ?>
    <?php endif; ?>
  </div>

  <div class="card">
    <h2>Add a new supervisor</h2>
    <form method="POST">
      <input type="hidden" name="action" value="create">

      <label>Name</label>
      <input type="text" name="name" placeholder="e.g. Mr. Kulin Maniar" required>

      <label>Email</label>
      <input type="email" name="email" placeholder="supervisor@bhavyatafoundation.org" required>

      <label>Password</label>
      <input type="password" name="password" placeholder="At least 6 characters" required minlength="6">

      <button type="submit">Create supervisor account</button>
    </form>
  </div>

</div>
</body>
</html>