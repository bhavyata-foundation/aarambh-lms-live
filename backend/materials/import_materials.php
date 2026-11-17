<?php
set_exception_handler(function($e){
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Server error: ' . $e->getMessage()]);
    exit;
});
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

// =========================================================================
// IMPORT MATERIALS — bulk version of add_materials.php. Same table,
// same columns, same teacher-to-class resolution — this just does it
// for every row in an uploaded file instead of one row from a form.
//
// Accepts EITHER a .csv or a real .xlsx file, both with exactly 3
// columns and a header row: item_name,quantity,received_date
//
// UPDATED: every row inserted here is tagged source = 'import', so the
// frontend can tell these rows apart from manually-added ones (which
// add_materials.php tags source = 'manual') and only offer a delete
// toggle on the imported rows.
//
// XLSX SUPPORT — deliberately NOT using a library like PhpSpreadsheet.
// That needs Composer and a vendor/ folder, which is one more thing to
// install and one more place a file can go missing — given how much
// trouble this project has had with files simply not being where PHP
// expects them, adding a dependency here is the wrong trade. An .xlsx
// file is just a ZIP of XML files; read_xlsx_rows() below reads the
// first sheet directly with PHP's built-in ZipArchive + SimpleXML,
// no external library at all. It only handles plain text/number
// cells (which is all a simple data-entry sheet like this needs) —
// no merged cells, no formulas, no multiple sheets.
// =========================================================================

session_start();
header('Content-Type: application/json');

$requestHost = strtok($_SERVER['HTTP_HOST'] ?? '', ':');
$isLocalRequest = in_array($requestHost, ['localhost', '127.0.0.1']);
$devRole = ($isLocalRequest && isset($_GET['dev_role'])) ? $_GET['dev_role'] : null;
$effectiveRole = $_SESSION['role'] ?? $devRole;

if ($effectiveRole !== 'teacher') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Not authorized.']);
    exit;
}

if (!isset($_FILES['import_file']) || $_FILES['import_file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'No file was received.']);
    exit;
}

$originalName = $_FILES['import_file']['name'];
$tmpPath = $_FILES['import_file']['tmp_name'];
$ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

if (!in_array($ext, ['csv', 'xlsx'], true)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Only .csv or .xlsx files are accepted — got .' . $ext]);
    exit;
}

// -------------------------------------------------------------------------
// Excel's own date serial-number system (day 1 = 1 Jan 1900, with the
// well-known Excel/Lotus leap-year bug baked in — this offset is the
// standard correction everyone uses).
// -------------------------------------------------------------------------
function excel_serial_to_ymd($serial){
    $unixTimestamp = ($serial - 25569) * 86400;
    return gmdate('Y-m-d', (int) $unixTimestamp);
}

// Accepts YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY — Excel (and this
// import) silently reformats dates to whatever the system's regional
// format is, so all three need to work, not just one.
function parse_received_date($raw){
    $raw = trim((string) $raw);
    if ($raw === '') return null;
    if (is_numeric($raw) && $raw > 20000 && $raw < 90000) { // plausible Excel date serial range
        return excel_serial_to_ymd((float) $raw);
    }
    $d = DateTime::createFromFormat('Y-m-d', $raw);
    if ($d && $d->format('Y-m-d') === $raw) return $raw;
    $d = DateTime::createFromFormat('d-m-Y', $raw);
    if ($d && $d->format('d-m-Y') === $raw) return $d->format('Y-m-d');
    $d = DateTime::createFromFormat('d/m/Y', $raw);
    if ($d && $d->format('d/m/Y') === $raw) return $d->format('Y-m-d');
    return null;
}

// -------------------------------------------------------------------------
// Reads every row of a CSV file into a plain array of arrays.
// -------------------------------------------------------------------------
function read_csv_rows($path){
    $rows = [];
    $handle = fopen($path, 'r');
    if (!$handle) return null;
    while (($row = fgetcsv($handle)) !== false) {
        $rows[] = $row;
    }
    fclose($handle);
    return $rows;
}

// -------------------------------------------------------------------------
// Reads the FIRST sheet of a real .xlsx file into a plain array of
// arrays, resolving shared strings, without any external library.
// -------------------------------------------------------------------------
function read_xlsx_rows($path){
    if (!class_exists('ZipArchive')) return null; // extension not enabled — caller reports this clearly

    $zip = new ZipArchive();
    if ($zip->open($path) !== true) return null;

    // Shared strings — most text cells reference an index into this
    // table rather than storing their own text inline.
    $sharedStrings = [];
    $sharedXml = $zip->getFromName('xl/sharedStrings.xml');
    if ($sharedXml !== false) {
        $sharedDoc = @simplexml_load_string($sharedXml);
        if ($sharedDoc !== false) {
            foreach ($sharedDoc->si as $si) {
                // A shared string can be plain <t>, or split across
                // multiple <r><t> "runs" (e.g. if it had mixed
                // formatting in Excel) — concatenate all of them.
                if (isset($si->t)) {
                    $sharedStrings[] = (string) $si->t;
                } else {
                    $text = '';
                    foreach ($si->r as $run) { $text .= (string) $run->t; }
                    $sharedStrings[] = $text;
                }
            }
        }
    }

    // Find the first real worksheet (usually sheet1.xml, but not
    // guaranteed if sheets were reordered/renamed in Excel).
    $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
    if ($sheetXml === false) {
        // Fall back to whatever the first worksheet entry actually is.
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if (preg_match('#^xl/worksheets/sheet\d+\.xml$#', $name)) {
                $sheetXml = $zip->getFromName($name);
                break;
            }
        }
    }
    $zip->close();
    if ($sheetXml === false || $sheetXml === null) return null;

    $sheetDoc = @simplexml_load_string($sheetXml);
    if ($sheetDoc === false) return null;

    $rows = [];
    foreach ($sheetDoc->sheetData->row as $rowXml) {
        $rowCells = [];
        $lastColIndex = -1;
        foreach ($rowXml->c as $cellXml) {
            $ref = (string) $cellXml['r']; // e.g. "B3"
            $colLetters = preg_replace('/\d+/', '', $ref);
            $colIndex = 0;
            foreach (str_split($colLetters) as $ch) {
                $colIndex = $colIndex * 26 + (ord($ch) - ord('A') + 1);
            }
            $colIndex -= 1; // zero-based

            // Fill any skipped (empty) columns so positions line up.
            while ($lastColIndex + 1 < $colIndex) {
                $rowCells[] = '';
                $lastColIndex++;
            }

            $type = (string) $cellXml['t'];
            $value = '';
            if ($type === 's') { // shared string
                $idx = (int) $cellXml->v;
                $value = $sharedStrings[$idx] ?? '';
            } elseif ($type === 'inlineStr') {
                $value = (string) $cellXml->is->t;
            } elseif ($type === 'str') { // formula result string
                $value = (string) $cellXml->v;
            } else { // numeric (includes dates stored as serials)
                $value = (string) $cellXml->v;
            }
            $rowCells[] = $value;
            $lastColIndex = $colIndex;
        }
        $rows[] = $rowCells;
    }
    return $rows;
}

$rawRows = ($ext === 'csv') ? read_csv_rows($tmpPath) : read_xlsx_rows($tmpPath);

if ($rawRows === null) {
    http_response_code(400);
    $msg = ($ext === 'xlsx')
        ? 'Could not read this .xlsx file. If your PHP install doesn\'t have the Zip extension enabled, save the sheet as .csv instead.'
        : 'Could not read the uploaded file.';
    echo json_encode(['status' => 'error', 'message' => $msg]);
    exit;
}
if (count($rawRows) < 1) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'The file appears to be empty.']);
    exit;
}

$header = array_map(fn($h) => strtolower(trim((string) $h)), $rawRows[0]);
$expectedHeader = ['item_name', 'quantity', 'received_date'];
if ($header !== $expectedHeader) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Header row must be exactly: item_name,quantity,received_date — got: ' . implode(',', $rawRows[0])
    ]);
    exit;
}

require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/../users/teacher_auth.php';
$conn = get_db_connection();

// Same teacher-to-class resolution used everywhere else in this
// project (get_my_class.php, get_materials.php): hardcoded to teacher
// 49, the one real teacher-to-class link that actually exists right
// now, rather than an unlinked "any teacher" lookup.
// Logged-in teacher only — never a guessed teacher (see users/teacher_auth.php).
$teacherId = current_teacher_id();

require_once __DIR__ . '/../users/teacher_class.php';
$classRow = teacher_active_class($conn, (int) $teacherId); // the class she is working in (class switch)

if (!$classRow) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Your account is not linked to a class yet — ask your admin to link it.']);
    exit;
}
$classId = $classRow['id'];

$stmt = $conn->prepare("
    INSERT INTO materials (class_id, item_name, quantity, received_date, added_by, source)
    VALUES (?, ?, ?, ?, ?, 'import')
");

$imported = 0;
$skipped = [];

for ($i = 1; $i < count($rawRows); $i++) {
    $rowNum = $i + 1; // header was row 1
    $row = $rawRows[$i];
    if (count($row) < 3) {
        $skipped[] = "Row $rowNum: expected 3 columns, got " . count($row);
        continue;
    }
    $itemName = trim((string) $row[0]);
    $quantity = trim((string) $row[1]);
    $receivedDateRaw = trim((string) $row[2]);

    if ($itemName === '') {
        $skipped[] = "Row $rowNum: item_name is blank";
        continue;
    }
    $receivedDate = parse_received_date($receivedDateRaw);
    if ($receivedDate === null) {
        $skipped[] = "Row $rowNum: received_date '$receivedDateRaw' is not a recognised date (tried YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, or an Excel date serial)";
        continue;
    }

    $stmt->bind_param('isssi', $classId, $itemName, $quantity, $receivedDate, $teacherId);
    if ($stmt->execute()) {
        $imported++;
    } else {
        $skipped[] = "Row $rowNum: database error — " . $stmt->error;
    }
}

$stmt->close();
$conn->close();

echo json_encode([
    'status' => 'success',
    'imported' => $imported,
    'skipped_count' => count($skipped),
    'skipped' => $skipped
]);
?>