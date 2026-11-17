<?php
// =========================================================================
// BULK CLASS ACCOUNTS — one login per school section.
// File: backend/auth/bulk_class_accounts.php
//
// Paste (or upload) a list of the new email IDs with the school and
// class each one belongs to. For every row this page:
//   1. creates the login (role = teacher), or reuses it if the email
//      already exists as a teacher,
//   2. links it to exactly ONE class — classes.teacher_user_id — which
//      is what every teacher screen uses to decide whose pupils,
//      attendance and assessments to show. So email 101 sees only its
//      own class's children, and so does every other email.
//
// Always PREVIEW first — nothing is written until you press Apply.
// Passwords are shown once on the result page (and in the CSV you can
// download there) — hand them out, then delete this file.
//
// Who can open it: a logged-in superadmin, or on localhost with
// ?dev_role=superadmin (same dev bypass the other endpoints use).
// =========================================================================

session_start();
header('Content-Type: text/html; charset=utf-8');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../teacher_leave/leave_helpers.php';
if (leave_effective_role() !== 'superadmin') {
    http_response_code(401);
    echo '<h2>Not authorized</h2><p>Log in as the super admin first (or open this on localhost with ?dev_role=superadmin).</p>';
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
$conn = get_db_connection();

function h($s){ return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }
function norm($s){ return strtolower(preg_replace('/\s+/', ' ', trim((string) $s))); }

function temp_password($seed){
    $base = preg_replace('/[^a-zA-Z]/', '', explode('@', $seed)[0]);
    $base = $base !== '' ? ucfirst(strtolower(substr($base, 0, 8))) : 'Bhavyata';
    return $base . str_pad((string) random_int(0, 999), 3, '0', STR_PAD_LEFT) . '@1';
}

// Reads CSV text: header row must contain email, school, class
// (name and password are optional columns).
function read_rows($text, &$errors){
    $lines = preg_split('/\r\n|\r|\n/', trim($text));
    $rows = [];
    if (!$lines || trim($lines[0]) === '') { $errors[] = 'The list is empty.'; return $rows; }
    $header = array_map('norm', str_getcsv(array_shift($lines)));
    $col = array_flip($header);
    if (!isset($col['email'])) { $errors[] = 'The header row needs an "email" column.'; return []; }
    if (!isset($col['class_id']) && !isset($col['school_id']) && !(isset($col['school']) && isset($col['class']))) {
        $errors[] = 'The header row needs a "class_id" column, a "school_id" column, or both "school" and "class" columns.'; return [];
    }
    foreach ($lines as $i => $line) {
        if (trim($line) === '') continue;
        $c = str_getcsv($line);
        $rows[] = [
            'line'     => $i + 2,
            'email'    => strtolower(trim($c[$col['email']] ?? '')),
            'class_id_in' => isset($col['class_id']) ? trim($c[$col['class_id']] ?? '') : '',
            'school_id_in' => isset($col['school_id']) ? trim($c[$col['school_id']] ?? '') : '',
            'school'   => isset($col['school']) ? trim($c[$col['school']] ?? '') : '',
            'class'    => isset($col['class']) ? trim($c[$col['class']] ?? '') : '',
            'name'     => isset($col['name']) ? trim($c[$col['name']] ?? '') : '',
            'password' => isset($col['password']) ? trim($c[$col['password']] ?? '') : '',
        ];
    }
    return $rows;
}

// ---- Lookups used by both preview and apply ----
$schools = [];      // normalised name -> [school rows] (names can repeat, e.g. two "Nehru Nagar MPS")
$schoolsById = [];
$res = $conn->query("SELECT id, name FROM schools");
while ($r = $res->fetch_assoc()) { $schools[norm($r['name'])][] = $r; $schoolsById[(int) $r['id']] = $r; }

$classes = []; // school_id|classname -> row
$res = $conn->query("
    SELECT c.id, c.school_id, c.name, c.teacher_user_id, u.email AS teacher_email,
           (SELECT COUNT(*) FROM pupils p WHERE p.class_id = c.id AND p.active = 1) AS pupil_count
    FROM classes c LEFT JOIN users u ON u.id = c.teacher_user_id
");
$classesById = [];
while ($r = $res->fetch_assoc()) { $classes[$r['school_id'] . '|' . norm($r['name'])] = $r; $classesById[(int) $r['id']] = $r; }

$usersByEmail = [];
$res = $conn->query("SELECT id, email, role, name FROM users");
while ($r = $res->fetch_assoc()) $usersByEmail[strtolower($r['email'])] = $r;

// Works out what would happen to each row, without writing anything.
function link_action(&$row, $cls, $reassign){
    if ($cls['teacher_user_id'] && strtolower((string) $cls['teacher_email']) !== $row['email']) {
        if ($reassign) $row['actions'][] = 'Move class from ' . $cls['teacher_email'] . ' to this email';
        else $row['problems'][] = 'Class ' . $cls['id'] . ' is already linked to ' . $cls['teacher_email'] . ' (tick "Move classes that already have a login" to move it).';
    } elseif (!$cls['teacher_user_id']) $row['actions'][] = 'Link class ' . $cls['id'];
    else $row['actions'][] = 'Already linked — no change';
}

function plan_rows($rows, $schoolsById, $classes, $usersByEmail, $reassign, $classesById, $schools){
    $seenEmail = []; $seenClass = [];
    $schoolNameById = [];
    foreach ($schoolsById as $sc) $schoolNameById[(int) $sc['id']] = $sc['name'];
    foreach ($rows as &$row) {
        $row['problems'] = []; $row['actions'] = [];
        if (!filter_var($row['email'], FILTER_VALIDATE_EMAIL)) $row['problems'][] = 'Not a valid email address.';
        if (isset($seenEmail[$row['email']])) $row['problems'][] = 'This email appears twice in the list.';
        $seenEmail[$row['email']] = true;

        // Preferred: the class id from the table at the bottom of this page.
        if ($row['class_id_in'] !== '') {
            $cid = filter_var($row['class_id_in'], FILTER_VALIDATE_INT);
            $cls = $cid ? ($classesById[$cid] ?? null) : null;
            if (!$cls) { $row['problems'][] = 'No class with id "' . $row['class_id_in'] . '".'; }
            else {
                $row['class_id'] = (int) $cls['id'];
                $row['school_id'] = (int) $cls['school_id'];
                $row['pupil_count'] = (int) $cls['pupil_count'];
                if ($row['school'] === '') $row['school'] = $schoolNameById[(int) $cls['school_id']] ?? ('#' . $cls['school_id']);
                if ($row['class'] === '') $row['class'] = $cls['name'] !== '' ? $cls['name'] : ('Class ' . $cls['id']);
                if (isset($seenClass['id' . $cls['id']])) $row['problems'][] = 'This class appears twice in the list — one email per class.';
                $seenClass['id' . $cls['id']] = true;
                if ($cls['teacher_user_id'] && strtolower((string) $cls['teacher_email']) !== $row['email']) {
                    if ($reassign) $row['actions'][] = 'Move class from ' . $cls['teacher_email'] . ' to this email';
                    else $row['problems'][] = 'Class is already linked to ' . $cls['teacher_email'] . ' (tick "Move classes that already have a login" to move it).';
                } elseif (!$cls['teacher_user_id']) $row['actions'][] = 'Link class';
                else $row['actions'][] = 'Already linked — no change';
            }
        } elseif ($row['school_id_in'] !== '') {
            // School id + section: use a class of that school not already taken
            // in this list — one named like the section first, then unnamed or
            // unlinked ones in id order; create one if the school has none left.
            $sid = filter_var($row['school_id_in'], FILTER_VALIDATE_INT);
            if (!$sid || !isset($schoolsById[$sid])) { $row['problems'][] = 'No school with id "' . $row['school_id_in'] . '".'; }
            else {
                $row['school_id'] = $sid;
                $row['school'] = $schoolsById[$sid]['name'];
                $cands = array_values(array_filter($classesById, fn($c) => (int) $c['school_id'] === $sid && !isset($seenClass['id' . $c['id']])));
                usort($cands, fn($a, $b) => $a['id'] <=> $b['id']);
                $pick = null;
                if ($row['class'] !== '') foreach ($cands as $c) if (norm($c['name']) === norm($row['class'])) { $pick = $c; break; }
                if (!$pick) foreach ($cands as $c) if (!$c['teacher_user_id'] || strtolower((string) $c['teacher_email']) === $row['email']) { $pick = $c; break; }
                if (!$pick && $reassign && $cands) $pick = $cands[0];
                if ($pick) {
                    $row['class_id'] = (int) $pick['id'];
                    $row['pupil_count'] = (int) $pick['pupil_count'];
                    $seenClass['id' . $pick['id']] = true;
                    link_action($row, $pick, $reassign);
                    if ($pick['name'] === '' && $row['class'] !== '') $row['actions'][] = 'Name it "' . $row['class'] . '"';
                    elseif ($row['class'] === '') $row['class'] = $pick['name'];
                    $row['existing_class_name'] = $pick['name'];
                } else {
                    $row['class_id'] = null;
                    $row['pupil_count'] = 0;
                    if ($row['class'] === '') $row['class'] = 'Section';
                    $row['actions'][] = 'Create class "' . $row['class'] . '" and link it';
                }
            }
        } else {
        $matches = $schools[norm($row['school'])] ?? [];
        if (count($matches) > 1) $row['problems'][] = 'Two schools are called "' . $row['school'] . '" — use school_id instead.';
        $school = count($matches) === 1 ? $matches[0] : null;
        if (!$school) { if (!$matches) $row['problems'][] = 'No school named "' . $row['school'] . '" in the database.'; }
        else {
            $row['school_id'] = (int) $school['id'];
            $key = $school['id'] . '|' . norm($row['class']);
            if ($row['class'] === '') $row['problems'][] = 'Class is blank.';
            if (isset($seenClass[$key])) $row['problems'][] = 'This class appears twice in the list — one email per class.';
            $seenClass[$key] = true;
            $cls = $classes[$key] ?? null;
            if ($cls) {
                $row['class_id'] = (int) $cls['id'];
                $row['pupil_count'] = (int) $cls['pupil_count'];
                if ($cls['teacher_user_id'] && strtolower((string) $cls['teacher_email']) !== $row['email']) {
                    if ($reassign) $row['actions'][] = 'Move class from ' . $cls['teacher_email'] . ' to this email';
                    else $row['problems'][] = 'Class is already linked to ' . $cls['teacher_email'] . ' (tick "Move classes that already have a login" to move it).';
                } elseif (!$cls['teacher_user_id']) {
                    $row['actions'][] = 'Link class';
                } else {
                    $row['actions'][] = 'Already linked — no change';
                }
            } else {
                $row['class_id'] = null;
                $row['pupil_count'] = 0;
                $row['actions'][] = 'Create class "' . $row['class'] . '" and link it';
            }
        }

        }

        $existing = $usersByEmail[$row['email']] ?? null;
        if ($existing && $existing['role'] !== 'teacher') $row['problems'][] = 'This email already exists as a ' . $existing['role'] . ' login.';
        elseif ($existing) array_unshift($row['actions'], 'Use existing login');
        else array_unshift($row['actions'], 'Create login');
    }
    unset($row);
    return $rows;
}

$mode = $_POST['mode'] ?? '';
$csvText = $_POST['csv'] ?? '';
if (!empty($_FILES['csvfile']['tmp_name'])) $csvText = file_get_contents($_FILES['csvfile']['tmp_name']);
$reassign = !empty($_POST['reassign']);
$errors = []; $rows = []; $results = [];

if ($mode === 'preview' || $mode === 'apply') {
    $rows = plan_rows(read_rows($csvText, $errors), $schoolsById, $classes, $usersByEmail, $reassign, $classesById, $schools);
}

if ($mode === 'apply' && !$errors) {
    $bad = array_filter($rows, fn($r) => $r['problems']);
    if ($bad) { $errors[] = 'Some rows still have problems — fix them and preview again. Nothing was saved.'; }
    else {
        $conn->begin_transaction();
        try {
            foreach ($rows as $row) {
                $password = '';
                $existing = $usersByEmail[$row['email']] ?? null;
                if ($existing) {
                    $userId = (int) $existing['id'];
                    if ($row['password'] !== '') { // a password given for an existing login resets it
                        $password = $row['password'];
                        $hash = password_hash($password, PASSWORD_BCRYPT);
                        $st = $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
                        $st->bind_param('si', $hash, $userId); $st->execute(); $st->close();
                    }
                } else {
                    $password = $row['password'] !== '' ? $row['password'] : temp_password($row['email']);
                    $hash = password_hash($password, PASSWORD_BCRYPT);
                    $name = $row['name'] !== '' ? $row['name'] : ($row['school'] . ' — ' . $row['class']);
                    $role = 'teacher';
                    $st = $conn->prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)");
                    $st->bind_param('ssss', $name, $row['email'], $hash, $role); $st->execute();
                    $userId = $st->insert_id; $st->close();
                }

                $classId = $row['class_id'];
                if (!$classId) {
                    $st = $conn->prepare("INSERT INTO classes (school_id, name) VALUES (?, ?)");
                    $st->bind_param('is', $row['school_id'], $row['class']); $st->execute();
                    $classId = $st->insert_id; $st->close();
                }
                if (isset($row['existing_class_name']) && $row['existing_class_name'] === '' && $row['class'] !== '') {
                    $st = $conn->prepare("UPDATE classes SET name = ? WHERE id = ? AND (name IS NULL OR name = '')");
                    $st->bind_param('si', $row['class'], $classId); $st->execute(); $st->close();
                }
                // One login, one class: clear this login from any other class first,
                // so it can never see two classes' children.
                $st = $conn->prepare("UPDATE classes SET teacher_user_id = NULL WHERE teacher_user_id = ? AND id <> ?");
                $st->bind_param('ii', $userId, $classId); $st->execute(); $st->close();
                $st = $conn->prepare("UPDATE classes SET teacher_user_id = ? WHERE id = ?");
                $st->bind_param('ii', $userId, $classId); $st->execute(); $st->close();

                $results[] = ['email' => $row['email'], 'password' => $password, 'school' => $row['school'], 'class' => $row['class'], 'class_id' => $classId, 'pupils' => $row['pupil_count']];
            }
            $conn->commit();
        } catch (Throwable $e) {
            $conn->rollback();
            $errors[] = 'Nothing was saved — the database said: ' . $e->getMessage();
            $results = [];
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Bulk class logins</title>
<style>
 body{font-family:system-ui,Segoe UI,sans-serif; margin:24px; color:#0c0e0b; max-width:1200px;}
 textarea{width:100%; min-height:220px; font-family:monospace; font-size:13px; padding:10px; box-sizing:border-box;}
 table{border-collapse:collapse; width:100%; margin-top:14px; font-size:13px;}
 th,td{border:1px solid #d9dcd5; padding:7px 9px; text-align:left; vertical-align:top;}
 th{background:#eef1ec;} .bad{background:#fbe4e4;} .ok{background:#e6f5e6;}
 .btn{padding:9px 18px; border-radius:8px; border:none; background:#1f7a4d; color:#fff; font-weight:600; cursor:pointer; margin-right:8px;}
 .btn.alt{background:#fff; color:#0c0e0b; border:1px solid #bbb;}
 .err{background:#fbe4e4; color:#a12727; padding:10px 12px; border-radius:8px; margin:12px 0;}
 .note{background:#fdf1d9; padding:10px 12px; border-radius:8px; margin:12px 0;}
 code{background:#eef1ec; padding:1px 5px; border-radius:4px;}
</style></head><body>
<h1>Bulk class logins — one email per school section</h1>
<p>Each email becomes a teacher login linked to exactly one class, so it only ever sees that class's children, attendance and assessments.</p>

<?php foreach ($errors as $e): ?><div class="err"><?= h($e) ?></div><?php endforeach; ?>

<?php if ($results): ?>
  <h2>✓ Done — <?= count($results) ?> login<?= count($results) === 1 ? '' : 's' ?> linked</h2>
  <div class="note"><b>Copy or download these passwords now — they are not shown again.</b> A blank password means the login already existed and its password was not changed. Then delete this file from the server.</div>
  <table><tr><th>Email</th><th>Password</th><th>School</th><th>Class</th><th>Class id</th><th>Children on roll</th></tr>
  <?php foreach ($results as $r): ?>
    <tr class="ok"><td><?= h($r['email']) ?></td><td><code><?= h($r['password']) ?></code></td><td><?= h($r['school']) ?></td><td><?= h($r['class']) ?></td><td><?= h($r['class_id']) ?></td><td><?= h($r['pupils']) ?></td></tr>
  <?php endforeach; ?></table>
  <?php
    $csvOut = "email,password,school,class,class_id,children_on_roll\n";
    foreach ($results as $r) $csvOut .= '"' . implode('","', array_map(fn($v) => str_replace('"', '""', (string) $v), [$r['email'], $r['password'], $r['school'], $r['class'], $r['class_id'], $r['pupils']])) . "\"\n";
  ?>
  <p><a class="btn" style="text-decoration:none; display:inline-block;" download="class-logins.csv" href="data:text/csv;charset=utf-8,<?= rawurlencode($csvOut) ?>">⬇ Download logins (.csv)</a></p>
<?php else: ?>

<form method="post" enctype="multipart/form-data">
  <p>Paste the list below, or upload a .csv. The first row must be the header. <b>Required:</b> <code>email</code> and <code>class_id</code> (from the <b>Class id</b> column in the table at the bottom of this page). <b>Optional:</b> <code>name</code> (shown in the portal), <code>password</code> (left blank, one is generated).</p>
  <p>Using the class id is the safest way — several classes here have no name yet. You can use <code>school</code> + <code>class</code> names instead of <code>class_id</code>, spelt exactly as in the table.</p>
  <p><b>The grey text in the box is only an example</b> — it disappears when you start typing. Replace it with your own list.</p>
  <textarea name="csv" placeholder="email,class_id,name,password&#10;101@bhavyata.org,47,Jr KG — Triveni,&#10;102@bhavyata.org,60,Andheri MPS — Section A,"><?= h($csvText) ?></textarea>
  <p>or upload: <input type="file" name="csvfile" accept=".csv"></p>
  <p><label><input type="checkbox" name="reassign" value="1" <?= $reassign ? 'checked' : '' ?>> Move classes that already have a login to the new email</label></p>
  <button class="btn" name="mode" value="preview">Preview</button>
  <?php if ($rows && !array_filter($rows, fn($r) => $r['problems'])): ?>
    <button class="btn" name="mode" value="apply" onclick="return confirm('Create/link these <?= count($rows) ?> logins now?')">Apply — save <?= count($rows) ?> login<?= count($rows) === 1 ? '' : 's' ?></button>
  <?php endif; ?>
</form>

<?php if ($rows): ?>
  <h2>Preview — nothing saved yet</h2>
  <table><tr><th>Line</th><th>Email</th><th>School</th><th>Class</th><th>Children on roll</th><th>What will happen</th><th>Problems</th></tr>
  <?php foreach ($rows as $r): ?>
    <tr class="<?= $r['problems'] ? 'bad' : 'ok' ?>">
      <td><?= h($r['line']) ?></td><td><?= h($r['email']) ?></td><td><?= h($r['school']) ?></td><td><?= h($r['class']) ?></td>
      <td><?= isset($r['pupil_count']) ? h($r['pupil_count']) : '—' ?></td>
      <td><?= h(implode(' · ', $r['actions'])) ?></td><td><?= h(implode(' ', $r['problems'])) ?></td>
    </tr>
  <?php endforeach; ?></table>
<?php endif; ?>

<h2>Schools and classes in the database now</h2>
<table><tr><th>School</th><th>Class</th><th>Class id</th><th>Linked login</th><th>Children on roll</th></tr>
<?php
  $byId = []; foreach ($schoolsById as $s) $byId[$s['id']] = $s['name'] . ' (school ' . $s['id'] . ')';
  $list = array_values($classes);
  usort($list, fn($a, $b) => strcmp(($byId[$a['school_id']] ?? '') . $a['name'], ($byId[$b['school_id']] ?? '') . $b['name']));
  foreach ($list as $c):
?>
  <tr><td><?= h($byId[$c['school_id']] ?? ('#' . $c['school_id'])) ?></td><td><?= $c['name'] !== '' ? h($c['name']) : '<i style="color:#999;">(no name)</i>' ?></td><td><b><?= h($c['id']) ?></b></td><td><?= h($c['teacher_email'] ?: '— none —') ?></td><td><?= h($c['pupil_count']) ?></td></tr>
<?php endforeach; ?>
</table>
<?php endif; ?>
</body></html>