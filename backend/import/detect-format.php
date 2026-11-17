<?php
header('Content-Type: application/json');

require_once __DIR__ . '/../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

function respond($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function extractDayNumber($value) {
    $value = trim((string)$value);

    if (preg_match('/^(?:[1-9]|[12][0-9]|3[01])$/', $value)) {
        return (int)$value;
    }

    if (preg_match('/^\s*([1-9]|[12][0-9]|3[01])(?:\s|\R)/u', $value, $match)) {
        return (int)$match[1];
    }

    return null;
}

function normalizeHeader($value) {
    $value = strtolower(trim((string)$value));
    $value = preg_replace('/\s+/', ' ', $value);
    return $value;
}

function detectMonthYearFromSheetName($sheetName) {
    $sheetName = strtoupper(trim($sheetName));

    $months = [
        'JAN' => 1,
        'FEB' => 2,
        'MAR' => 3,
        'APR' => 4,
        'MAY' => 5,
        'JUN' => 6,
        'JUL' => 7,
        'JULY' => 7,
        'AUG' => 8,
        'SEP' => 9,
        'SEPT' => 9,
        'OCT' => 10,
        'NOV' => 11,
        'DEC' => 12,
    ];

    foreach ($months as $name => $monthNumber) {

        if (strpos($sheetName, $name) !== false) {

            $year = null;

            if (preg_match('/\b(20\d{2})\b/', $sheetName, $m)) {
                $year = (int)$m[1];
            } elseif (preg_match('/\b(\d{2})\b/', $sheetName, $m)) {
                $year = 2000 + (int)$m[1];
            }

            if ($year) {
                return [
                    'month' => $monthNumber,
                    'year' => $year,
                    'month_key' => sprintf('%04d-%02d', $year, $monthNumber)
                ];
            }
        }
    }

    return null;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond([
        'status' => 'error',
        'message' => 'POST request required.'
    ], 405);
}

if (!isset($_FILES['file'])) {
    respond([
        'status' => 'error',
        'message' => 'No Excel file uploaded.'
    ], 400);
}

$file = $_FILES['file'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    respond([
        'status' => 'error',
        'message' => 'Upload failed.'
    ], 400);
}

$extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($extension, ['xlsx', 'xls'])) {
    respond([
        'status' => 'error',
        'message' => 'Only .xlsx or .xls files are allowed.'
    ], 400);
}

try {

    $spreadsheet = IOFactory::load($file['tmp_name']);

    $result = [];

    foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {

        $highestRow = $worksheet->getHighestRow();
        $highestColumn = $worksheet->getHighestColumn();
        $highestColumnIndex = Coordinate::columnIndexFromString($highestColumn);

        $headerRows = [];
        $sections = [];

        for ($row = 1; $row <= $highestRow; $row++) {

            $hasStudentName = false;
            $attendanceDaysFound = [];

            $columnMap = [
                'roll_no' => null,
                'register_no' => null,
                'student_name' => null,
                'attendance_days' => []
            ];

            for ($col = 1; $col <= $highestColumnIndex; $col++) {

                $cell = $worksheet->getCell([$col, $row]);
                $rawValue = trim((string)$cell->getFormattedValue());
                $normalized = normalizeHeader($rawValue);

                $columnLetter = Coordinate::stringFromColumnIndex($col);

                if (
                    $normalized === 'student name' ||
                    $normalized === 'student' ||
                    $normalized === 'name'
                ) {
                    $hasStudentName = true;
                    $columnMap['student_name'] = $columnLetter;
                }

                if (
                    $normalized === 'roll no' ||
                    $normalized === 'roll no.' ||
                    $normalized === 'roll number' ||
                    $normalized === 'sr no' ||
                    $normalized === 'sr. no.'
                ) {
                    $columnMap['roll_no'] = $columnLetter;
                }

                if (
                    $normalized === 'register no' ||
                    $normalized === 'register no.' ||
                    $normalized === 'register number' ||
                    $normalized === 'admission no' ||
                    $normalized === 'admission no.'
                ) {
                    $columnMap['register_no'] = $columnLetter;
                }

                $dayNumber = extractDayNumber($rawValue);

                if ($dayNumber !== null) {
                    $attendanceDaysFound[$dayNumber] = true;
                    $columnMap['attendance_days'][$dayNumber] = $columnLetter;
                }
            }

            if (
                $hasStudentName &&
                count($attendanceDaysFound) >= 5
            ) {
                $headerRows[] = $row;

                ksort($columnMap['attendance_days']);

                $sections[] = [
                    'header_row' => $row,
                    'columns' => $columnMap,
                    'attendance_day_count' => count($columnMap['attendance_days'])
                ];
            }
        }

        $monthInfo = detectMonthYearFromSheetName(
            $worksheet->getTitle()
        );

        $result[] = [
            'sheet' => $worksheet->getTitle(),
            'highest_row' => $highestRow,
            'highest_column' => $highestColumn,
            'header_rows' => $headerRows,
            'sections_found' => count($headerRows),
            'month' => $monthInfo,
            'sections' => $sections
        ];
    }

    respond([
        'status' => 'success',
        'filename' => $file['name'],
        'sheets' => $result
    ]);

} catch (Throwable $e) {

    respond([
        'status' => 'error',
        'message' => 'Could not read Excel file.',
        'detail' => $e->getMessage()
    ], 500);
}