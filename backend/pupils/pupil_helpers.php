<?php
// =========================================================================
// SHARED PUPIL HELPERS
// =========================================================================

function pupil_json_error($statusCode, $message)
{
    http_response_code($statusCode);

    echo json_encode([
        'status' => 'error',
        'message' => $message
    ]);

    exit;
}


// =========================================================================
// REQUEST / AUTH HELPERS
// =========================================================================

function pupil_is_local_request()
{
    $host = strtok($_SERVER['HTTP_HOST'] ?? '', ':');

    return in_array(
        $host,
        ['localhost', '127.0.0.1'],
        true
    );
}


function pupil_effective_role()
{
    $devRole = (
        pupil_is_local_request() &&
        isset($_GET['dev_role'])
    )
        ? $_GET['dev_role']
        : null;

    return $_SESSION['role'] ?? $devRole;
}


// =========================================================================
// CLASS AUTHORIZATION
// =========================================================================

function pupil_authorized_class($conn, $requestedClassId = null)
{
    if (pupil_effective_role() !== 'teacher') {
        pupil_json_error(401, 'Not authorized.');
    }

    $teacherId = isset($_SESSION['user_id'])
        ? (int) $_SESSION['user_id']
        : null;

    $isLocal = pupil_is_local_request();

    $classId = filter_var(
        $requestedClassId,
        FILTER_VALIDATE_INT
    );


    // ---------------------------------------------------------
    // Explicit class_id supplied
    // ---------------------------------------------------------

    if (
        $classId !== false &&
        $classId !== null &&
        $classId > 0
    ) {
        $stmt = $conn->prepare(
            'SELECT id, school_id, teacher_user_id
             FROM classes
             WHERE id = ?
             LIMIT 1'
        );

        $stmt->bind_param(
            'i',
            $classId
        );

        $stmt->execute();

        $class = $stmt
            ->get_result()
            ->fetch_assoc();

        $stmt->close();


        if (!$class) {
            pupil_json_error(
                404,
                'Class not found.'
            );
        }


        if (
            $teacherId &&
            (int) $class['teacher_user_id'] !== $teacherId
        ) {
            pupil_json_error(
                403,
                'This class is not linked to your login.'
            );
        }


        if (
            !$teacherId &&
            !$isLocal
        ) {
            pupil_json_error(
                401,
                'Please log in again.'
            );
        }


        return [
            'id' => (int) $class['id'],
            'school_id' => (int) $class['school_id'],
            'teacher_user_id' => (int) $class['teacher_user_id']
        ];
    }


    // ---------------------------------------------------------
    // Backward-compatible fallback
    // ---------------------------------------------------------

    if ($teacherId) {

        // The class she is working in (class switch), else her first.
        require_once __DIR__ . '/../users/teacher_class.php';
        $class = teacher_active_class($conn, $teacherId);
        if ($class) $class['teacher_user_id'] = $teacherId;

    } elseif ($isLocal) {

        $class = $conn->query(
            'SELECT id, school_id, teacher_user_id
             FROM classes
             ORDER BY
                 (teacher_user_id = 49) DESC,
                 id
             LIMIT 1'
        )->fetch_assoc();

    } else {

        pupil_json_error(
            401,
            'Please log in again.'
        );
    }


    if (!$class) {
        pupil_json_error(
            403,
            'This login is not linked to a class yet.'
        );
    }


    return [
        'id' => (int) $class['id'],
        'school_id' => (int) $class['school_id'],
        'teacher_user_id' => (int) $class['teacher_user_id']
    ];
}


// =========================================================================
// NAME HELPERS
// =========================================================================

function pupil_normalize_name($value)
{
    $name = trim((string) $value);

    // Remove zero-width characters.
    $name = preg_replace(
        '/[\x{200B}-\x{200D}\x{FEFF}]/u',
        '',
        $name
    );

    // Normalize spaces.
    $name = preg_replace(
        '/[\s\x{00A0}]+/u',
        ' ',
        $name
    );

    if (function_exists('mb_strtolower')) {
        $name = mb_strtolower(
            $name,
            'UTF-8'
        );
    } else {
        $name = strtolower($name);
    }

    return trim($name);
}


function pupil_clean_name($value)
{
    $name = trim((string) $value);

    $name = preg_replace(
        '/[\x{200B}-\x{200D}\x{FEFF}]/u',
        '',
        $name
    );

    return trim(
        preg_replace(
            '/[\s\x{00A0}]+/u',
            ' ',
            $name
        )
    );
}


// =========================================================================
// REGISTER / ROLL NUMBER
// =========================================================================

function pupil_clean_register_no($value)
{
    $value = trim((string) $value);

    // Excel sometimes turns 12 into "12.0".
    $value = preg_replace(
        '/\.0+$/',
        '',
        $value
    );

    // Register number must contain only digits.
    // Empty / invalid values become NULL.
    if (
        $value === '' ||
        !preg_match('/^\d{1,10}$/', $value)
    ) {
        return null;
    }

    return $value;
}


// =========================================================================
// MIN NUMBER
// =========================================================================

function pupil_clean_min_no($value)
{
    $value = trim((string) $value);

    // Excel sometimes turns numeric values into "123.0".
    $value = preg_replace(
        '/\.0+$/',
        '',
        $value
    );

    /*
     * MIN number is stored as text because the database column is
     * VARCHAR(50).
     *
     * Allow:
     *   123
     *   MIN123
     *   M123
     *   2026-001
     *
     * We only reject blank values and excessively long values here.
     * The actual format can therefore match the school's existing
     * MIN-number convention.
     */

    if ($value === '') {
        return null;
    }

    if (strlen($value) > 50) {
        return null;
    }

    return $value;
}


// =========================================================================
// IDENTIFIER HELPERS
// =========================================================================

function pupil_has_register_no($value)
{
    return pupil_clean_register_no($value) !== null;
}


function pupil_has_min_no($value)
{
    return pupil_clean_min_no($value) !== null;
}


function pupil_has_any_identifier($pupil)
{
    $register = pupil_clean_register_no(
        $pupil['register_no'] ?? ''
    );

    $min = pupil_clean_min_no(
        $pupil['min_no'] ?? ''
    );

    return (
        $register !== null ||
        $min !== null
    );
}


// A pupil with neither identifier must be manually verified.
function pupil_identifier_status($pupil)
{
    $register = pupil_clean_register_no(
        $pupil['register_no'] ?? ''
    );

    $min = pupil_clean_min_no(
        $pupil['min_no'] ?? ''
    );


    if (
        $register === null &&
        $min === null
    ) {
        return 'missing_both';
    }


    if ($register === null) {
        return 'missing_register';
    }


    if ($min === null) {
        return 'missing_min';
    }


    return 'complete';
}


// =========================================================================
// DATE HELPERS
// =========================================================================

function pupil_valid_date_or_null($value)
{
    $value = trim((string) $value);

    if ($value === '') {
        return null;
    }

    $date = DateTime::createFromFormat(
        '!Y-m-d',
        $value
    );

    return (
        $date &&
        $date->format('Y-m-d') === $value
    )
        ? $value
        : null;
}


// =========================================================================
// DYNAMIC MYSQLI BINDING
// =========================================================================

function pupil_bind_params(
    $statement,
    $types,
    &$values
) {
    $references = [];

    foreach ($values as $key => &$value) {
        $references[$key] = &$value;
    }

    $statement->bind_param(
        $types,
        ...$references
    );
}


// =========================================================================
// DATABASE COLUMN HELPERS
// =========================================================================

function pupil_column_set($conn)
{
    $columns = [];

    $result = $conn->query(
        'SHOW COLUMNS FROM pupils'
    );

    while ($row = $result->fetch_assoc()) {
        $columns[$row['Field']] = true;
    }

    return $columns;
}


// =========================================================================
// ACTIVE ROSTER
// =========================================================================

function pupil_active_roster(
    $conn,
    $classId,
    $columns = null
) {
    $columns = $columns ?: pupil_column_set($conn);

    // Children who can have a student ID but don't yet (e.g. just added) get one now
    pupil_fill_student_ids($conn, $classId);


    $optional = [
        'register_no',
        'min_no',
        'address',
        'dob',
        'gender',
        'specially_abled',
        'prev_studied',
        'prev_school',
        'prev_standard',
        'prev_board',
        'prev_reason',
        'receipt_drive_link',
        'receipt_drive_file_id'
    ];


    $select = [
        'id',
        'school_id',
        'class_id',
        'name',
        'admitted_date',
        'active'
    ];


    foreach ($optional as $field) {

        $select[] = isset($columns[$field])
            ? "`{$field}`"
            : "NULL AS `{$field}`";
    }


    // Registered pupils first.
    // Pupils without register numbers go after them.
    $registerOrder = isset($columns['register_no'])
        ? "(register_no IS NULL OR register_no = '') ASC,
           CAST(NULLIF(register_no, '') AS UNSIGNED) ASC,
           register_no ASC,"
        : '';


    $sql =
        'SELECT ' .
        implode(', ', $select) .
        ' FROM pupils
          WHERE class_id = ?
          AND active = 1
          ORDER BY ' .
        $registerOrder .
        ' name ASC';


    $stmt = $conn->prepare($sql);

    $stmt->bind_param(
        'i',
        $classId
    );

    $stmt->execute();

    $result = $stmt->get_result();

    $pupils = [];


    while ($row = $result->fetch_assoc()) {

        $row['id'] = (int) $row['id'];

        $row['school_id'] = (int) $row['school_id'];

        $row['class_id'] = (int) $row['class_id'];

        $row['active'] = (int) $row['active'];

        $row['specially_abled'] =
            (int) ($row['specially_abled'] ?? 0);

        $row['prev_studied'] =
            (int) ($row['prev_studied'] ?? 0);


        $row['register_no'] =
            $row['register_no'] !== null &&
            $row['register_no'] !== ''
                ? (string) $row['register_no']
                : null;


        $row['min_no'] =
            $row['min_no'] !== null &&
            $row['min_no'] !== ''
                ? (string) $row['min_no']
                : null;


        $row['identifier_status'] =
            pupil_identifier_status($row);
        // Student ID (permanent) and this academic year's code (shown, not stored)
        $row['student_id'] = $row['min_no'];
        $row['year_code'] = pupil_year_code($row['min_no']);


        $pupils[] = $row;
    }


    $stmt->close();

    return $pupils;
}
// =========================================================================
// THE SAME CHILD IN ANOTHER SPELLING
// The same rule as js/name-match.js: "Darsh Pandey" = "Darsh Pande",
// "Sneha Niwdunge" = "Sneha Nivdunge", "Shinde Dwarka" = "Dwarka Shinde"
// (only clear cases; uncertain ones are the teacher's choice in the import
// preview). Used before a child is created, so a
// sheet uploaded again with a spelling difference never puts the same
// child on the roll twice. Works without mbstring.
// =========================================================================
function pupil_plain_name($value)
{
    $s = strtolower(trim((string) $value));
    $s = preg_replace('/^\s*\d+[\s.)\-:]+/', '', $s);          // a register number in front
    $s = preg_replace('/[._,;:()\'"`\-]+/', ' ', $s);
    return trim(preg_replace('/\s+/', ' ', $s));
}

function pupil_sound_word($w)
{
    $s = preg_replace('/[^a-z\x{0900}-\x{097f}]/u', '', $w);
    if (!preg_match('/[a-z]/', $s)) return $s;                 // Devanagari: as written
    $rules = [
        '/ksh/' => 'x', '/x/' => 'ks', '/sh|s/' => 's', '/ch/' => 'c', '/th/' => 't', '/dh/' => 'd',
        '/kh/' => 'k', '/gh/' => 'g', '/ph/' => 'f', '/bh/' => 'b', '/jh/' => 'j', '/rh/' => 'r',
        '/ck/' => 'k', '/q/' => 'k', '/w/' => 'v', '/z/' => 'j',
        '/aa/' => 'a', '/ee|ii/' => 'i', '/oo|uu/' => 'u', '/ou|au/' => 'o', '/ai|ei|ay|ey/' => 'e', '/y/' => 'i',
        '/(.)\1+/' => '$1', '/h(?![aeiou])/' => '', '/([^aeiou])h/' => '$1', '/(.{3,})[ae]$/' => '$1',
    ];
    foreach ($rules as $re => $to) $s = preg_replace($re, $to, $s);
    return $s;
}

function pupil_sound_key($name)
{
    $words = array_filter(explode(' ', pupil_plain_name($name)), 'strlen');
    return implode(' ', array_map('pupil_sound_word', $words));
}

/**
 * An existing child of this class who is the same name in another spelling
 * (or the same words in another order) — or null. $records: [id => row with 'name'].
 * Exactly one such child, else null (two look-alikes = can't tell, let the teacher decide).
 */
function pupil_find_lookalike(array $records, $name, $exceptId = null)
{
    $key = pupil_sound_key($name);
    if ($key === '') return null;
    $sorted = explode(' ', $key); sort($sorted); $sorted = implode(' ', $sorted);
    $hits = [];
    foreach ($records as $id => $row) {
        if ($exceptId !== null && (int) $id === (int) $exceptId) continue;
        $k = pupil_sound_key($row['name'] ?? '');
        $ks = explode(' ', $k); sort($ks);
        if ($k === $key || implode(' ', $ks) === $sorted) $hits[] = (int) $id;
    }
    return count($hits) === 1 ? $hits[0] : null;
}


// =========================================================================
// STUDENT ID  (Oct 2026)
// -------------------------------------------------------------------------
// The permanent student ID is kept in min_no:
//     <school code>-<register no><BATCH year, 2 digits>   e.g. KW-ADR-500126
// School code = MCGM ward + short school name (KW-ADR = K/West, Andheri).
// BATCH year = the year the child's batch is in Jr KG
//            = this academic year − class level (classes.level:
//              Jr KG 0 · Sr KG 1 · 1st std 2 · 2nd std 3)
// so no history or admission date is needed. Made once, when the child has
// a 3–5 digit register number, the school a code and the class a level
// (backend/sql/009_student_ids.sql). It never changes — also when the child
// moves up. A MIN number the school already gave is never overwritten.
// "This year's code" is the same with the current academic year instead —
// KW-ADR-500127 in Sr KG, KW-ADR-500128 in 1st std — shown, never stored.
// Academic year = the year it starts in June (2026–27 → 26).
// =========================================================================
function pupil_academic_yy($date = null)
{
    $t = $date ? strtotime((string) $date) : time();
    if (!$t) $t = time();
    $year = (int) date('Y', $t);
    if ((int) date('n', $t) < 6) $year--;
    return str_pad((string) ($year % 100), 2, '0', STR_PAD_LEFT);
}

function pupil_fill_student_ids($conn, $classId = null)
{
    static $ready = null;
    if ($ready === null) {
        $r = $conn->query("SHOW COLUMNS FROM schools LIKE 'code'");
        $l = $conn->query("SHOW COLUMNS FROM classes LIKE 'level'");
        $ready = $r && $r->num_rows > 0 && $l && $l->num_rows > 0;
    }
    if (!$ready) return 0;   // before 009_student_ids.sql: nothing to do
    $acad = (int) date('Y') - ((int) date('n') < 6 ? 1 : 0);   // this academic year (PHP: Asia/Kolkata)
    $sql = "UPDATE IGNORE pupils p
              JOIN schools s ON s.id = p.school_id
              JOIN classes c ON c.id = p.class_id
               SET p.min_no = CONCAT(s.code, '-', p.register_no,
                     LPAD(MOD({$acad} - c.level, 100), 2, '0'))
             WHERE (p.min_no IS NULL OR p.min_no = '')
               AND p.register_no REGEXP '^[0-9]{3,5}$'
               AND s.code IS NOT NULL AND s.code <> ''
               AND c.level IS NOT NULL"
         . ($classId ? ' AND p.class_id = ' . (int) $classId : '');
    try {
        $conn->query($sql);
        return $conn->affected_rows;
    } catch (Throwable $e) {
        error_log('pupil_fill_student_ids: ' . $e->getMessage());
        return 0;
    }
}

function pupil_year_code($studentId)
{
    // <school code (may contain a hyphen, e.g. KW-ADR)>-<register no 3–5 digits><batch 2 digits>
    if (!$studentId || !preg_match('/^([A-Z0-9]+(?:-[A-Z0-9]+)?)-(\d{3,5})(\d{2})$/', (string) $studentId, $m)) return null;
    return $m[1] . '-' . $m[2] . pupil_academic_yy();
}