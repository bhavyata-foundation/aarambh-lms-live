<?php

header('Content-Type: application/json');

require_once __DIR__ . '/../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;


/* =========================================================
   RESPONSE HELPER
   ========================================================= */

function respond($data, $statusCode = 200)
{
    http_response_code($statusCode);

    echo json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
    );

    exit;
}


/* =========================================================
   HEADER NORMALISATION
   ========================================================= */

function normalizeHeader($value)
{
    $value = strtolower(trim((string)$value));
    $value = preg_replace('/\s+/', ' ', $value);

    return $value;
}


/* =========================================================
   DAY DETECTION

   Handles:
   1
   2
   31

   and also:

   1
   Wed

   or:
   "1 Wed"
   ========================================================= */

function extractDayNumber($value)
{
    $value = trim((string)$value);

    // Plain day number
    if (
        preg_match(
            '/^(?:[1-9]|[12][0-9]|3[01])$/',
            $value
        )
    ) {
        return (int)$value;
    }

    // Day number followed by weekday/text
    if (
        preg_match(
            '/^\s*([1-9]|[12][0-9]|3[01])(?:\s|\R)/u',
            $value,
            $match
        )
    ) {
        return (int)$match[1];
    }

    return null;
}


/* =========================================================
   MONTH + YEAR DETECTION FROM SHEET NAME

   Examples:
   JULY 26
   AUG 26
   JULY 2026
   AUGUST 2026
   ========================================================= */

function detectMonthYear($sheetName)
{
    $sheetName = strtoupper(trim($sheetName));

    $months = [
        'JANUARY'   => 1,
        'JAN'       => 1,

        'FEBRUARY'  => 2,
        'FEB'       => 2,

        'MARCH'     => 3,
        'MAR'       => 3,

        'APRIL'     => 4,
        'APR'       => 4,

        'MAY'       => 5,

        'JUNE'      => 6,
        'JUN'       => 6,

        'JULY'      => 7,
        'JUL'       => 7,

        'AUGUST'    => 8,
        'AUG'       => 8,

        'SEPTEMBER' => 9,
        'SEPT'      => 9,
        'SEP'       => 9,

        'OCTOBER'   => 10,
        'OCT'       => 10,

        'NOVEMBER'  => 11,
        'NOV'       => 11,

        'DECEMBER'  => 12,
        'DEC'       => 12
    ];

    foreach ($months as $name => $monthNumber) {

        if (strpos($sheetName, $name) === false) {
            continue;
        }

        $year = null;

        // Full year like 2026
        if (
            preg_match(
                '/\b(20\d{2})\b/',
                $sheetName,
                $match
            )
        ) {
            $year = (int)$match[1];
        }

        // Short year like 26
        elseif (
            preg_match(
                '/\b(\d{2})\b/',
                $sheetName,
                $match
            )
        ) {
            $year = 2000 + (int)$match[1];
        }

        if ($year !== null) {

            return [
                'month' => $monthNumber,
                'year' => $year,
                'month_key' => sprintf(
                    '%04d-%02d',
                    $year,
                    $monthNumber
                )
            ];
        }
    }

    return null;
}


/* =========================================================
   ATTENDANCE NORMALISATION

   IMPORTANT:
   We do not guess attendance.

   P     -> P
   A     -> A
   H     -> H
   blank -> null

   Anything else -> warning
   ========================================================= */

function normalizeAttendance($value)
{
    $value = strtoupper(
        trim((string)$value)
    );

    if ($value === '') {

        return [
            'value' => null,
            'valid' => true
        ];
    }

    if (
        $value === 'P' ||
        $value === 'A' ||
        $value === 'H'
    ) {

        return [
            'value' => $value,
            'valid' => true
        ];
    }

    return [
        'value' => null,
        'valid' => false,
        'original' => $value
    ];
}


/* =========================================================
   DETECT ATTENDANCE SECTIONS

   Finds repeated headers in the same worksheet.

   Example:
   Row 4
   Row 53
   ========================================================= */

function detectSections($worksheet)
{
    $highestRow =
        $worksheet->getHighestRow();

    $highestColumnIndex =
        Coordinate::columnIndexFromString(
            $worksheet->getHighestColumn()
        );

    $sections = [];

    for ($row = 1; $row <= $highestRow; $row++) {

        $studentNameColumn = null;
        $registerNoColumn = null;
        $rollNoColumn = null;

        $days = [];

        for (
            $col = 1;
            $col <= $highestColumnIndex;
            $col++
        ) {

            $cell =
                $worksheet->getCell(
                    [$col, $row]
                );

            $rawValue = trim(
                (string)$cell->getFormattedValue()
            );

            $header =
                normalizeHeader($rawValue);

            $columnLetter =
                Coordinate::stringFromColumnIndex(
                    $col
                );


            /* -------------------------
               Student Name
               ------------------------- */

            if (
                $header === 'student name' ||
                $header === 'student' ||
                $header === 'name'
            ) {
                $studentNameColumn =
                    $columnLetter;
            }


            /* -------------------------
               Register Number
               ------------------------- */

            if (
                $header === 'register no' ||
                $header === 'register no.' ||
                $header === 'register number' ||
                $header === 'admission no' ||
                $header === 'admission no.' ||
                $header === 'admission number'
            ) {
                $registerNoColumn =
                    $columnLetter;
            }


            /* -------------------------
               Roll Number
               ------------------------- */

            if (
                $header === 'roll no' ||
                $header === 'roll no.' ||
                $header === 'roll number' ||
                $header === 'sr no' ||
                $header === 'sr. no.' ||
                $header === 'sr no.'
            ) {
                $rollNoColumn =
                    $columnLetter;
            }


            /* -------------------------
               Day columns
               ------------------------- */

            $dayNumber =
                extractDayNumber($rawValue);

            if ($dayNumber !== null) {

                $days[$dayNumber] =
                    $columnLetter;
            }
        }


        /*
         * A valid attendance header must have:
         *
         * - Student Name
         * - At least 5 date columns
         */

        if (
            $studentNameColumn !== null &&
            count($days) >= 5
        ) {

            ksort($days);

            $sections[] = [
                'header_row' =>
                    $row,

                'student_name_column' =>
                    $studentNameColumn,

                'register_no_column' =>
                    $registerNoColumn,

                'roll_no_column' =>
                    $rollNoColumn,

                'days' =>
                    $days
            ];
        }
    }

    return $sections;
}


/* =========================================================
   REQUEST CHECKS
   ========================================================= */

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


$sheetName =
    isset($_POST['sheet'])
        ? trim((string)$_POST['sheet'])
        : '';


if ($sheetName === '') {

    respond([
        'status' => 'error',
        'message' => 'Sheet name is required.'
    ], 400);
}


$file =
    $_FILES['file'];


if ($file['error'] !== UPLOAD_ERR_OK) {

    respond([
        'status' => 'error',
        'message' => 'Upload failed.'
    ], 400);
}


/* =========================================================
   FILE TYPE CHECK
   ========================================================= */

$extension =
    strtolower(
        pathinfo(
            $file['name'],
            PATHINFO_EXTENSION
        )
    );


if (
    !in_array(
        $extension,
        ['xlsx', 'xls'],
        true
    )
) {

    respond([
        'status' => 'error',
        'message' =>
            'Only .xlsx or .xls files are allowed.'
    ], 400);
}


/* =========================================================
   OPEN EXCEL
   ========================================================= */

try {

    $spreadsheet =
        IOFactory::load(
            $file['tmp_name']
        );


    $worksheet =
        $spreadsheet->getSheetByName(
            $sheetName
        );


    if (!$worksheet) {

        respond([
            'status' => 'error',
            'message' => 'Sheet not found.'
        ], 400);
    }


    /* =====================================================
       DETECT MONTH / YEAR
       ===================================================== */

    $monthInfo =
        detectMonthYear(
            $sheetName
        );


    if (!$monthInfo) {

        respond([
            'status' => 'error',
            'message' =>
                'Could not detect month/year from sheet name.'
        ], 400);
    }


    /* =====================================================
       DETECT ATTENDANCE SECTIONS
       ===================================================== */

    $sections =
        detectSections(
            $worksheet
        );


    if (!$sections) {

        respond([
            'status' => 'error',
            'message' =>
                'No attendance sections detected.'
        ], 400);
    }


    /* =====================================================
       READ STUDENTS
       ===================================================== */

    $students = [];

    $warnings = [];

    $highestRow =
        $worksheet->getHighestRow();


    foreach (
        $sections
        as $sectionIndex => $section
    ) {

        $startRow =
            $section['header_row'] + 1;


        /*
         * Stop this section before the next repeated header.
         */

        if (
            isset(
                $sections[
                    $sectionIndex + 1
                ]
            )
        ) {

            $endRow =
                $sections[
                    $sectionIndex + 1
                ]['header_row'] - 1;
        }

        else {

            $endRow =
                $highestRow;
        }


        for (
            $row = $startRow;
            $row <= $endRow;
            $row++
        ) {

            /* ---------------------------------------------
               Read Student Name
               --------------------------------------------- */

            $name = trim(
                (string)$worksheet
                    ->getCell(
                        $section[
                            'student_name_column'
                        ] . $row
                    )
                    ->getFormattedValue()
            );


            /*
             * Blank name = not a student row.
             */

            if ($name === '') {
                continue;
            }


            /* ---------------------------------------------
               Read Roll Number FIRST
               --------------------------------------------- */

            $rollNo = null;

            if (
                $section[
                    'roll_no_column'
                ]
            ) {

                $rollNo = trim(
                    (string)$worksheet
                        ->getCell(
                            $section[
                                'roll_no_column'
                            ] . $row
                        )
                        ->getFormattedValue()
                );
            }


            /*
             * IMPORTANT FIX:
             *
             * In your actual Sr kg.xlsx there are rows like:
             *
             * Total Present
             * Total Absent
             *
             * These are not students.
             *
             * Real student rows have a numeric roll number.
             *
             * So when a Roll No. column exists,
             * require a numeric value.
             */

            if (
                $section[
                    'roll_no_column'
                ]
            ) {

                if (
                    $rollNo === '' ||
                    !is_numeric($rollNo)
                ) {
                    continue;
                }
            }


            /* ---------------------------------------------
               Read Register Number
               --------------------------------------------- */

            $registerNo = null;

            if (
                $section[
                    'register_no_column'
                ]
            ) {

                $registerNo = trim(
                    (string)$worksheet
                        ->getCell(
                            $section[
                                'register_no_column'
                            ] . $row
                        )
                        ->getFormattedValue()
                );
            }


            /* ---------------------------------------------
               Attendance
               --------------------------------------------- */

            $attendance = [];


            foreach (
                $section['days']
                as $day => $column
            ) {

                /*
                 * Skip impossible dates.
                 *
                 * Example:
                 * June 31
                 */

                if (
                    !checkdate(
                        $monthInfo['month'],
                        (int)$day,
                        $monthInfo['year']
                    )
                ) {
                    continue;
                }


                $date = sprintf(
                    '%04d-%02d-%02d',
                    $monthInfo['year'],
                    $monthInfo['month'],
                    $day
                );


                $rawAttendance =
                    $worksheet
                        ->getCell(
                            $column . $row
                        )
                        ->getFormattedValue();


                $normalized =
                    normalizeAttendance(
                        $rawAttendance
                    );


                /*
                 * Unknown attendance value.
                 *
                 * Never guess.
                 */

                if (
                    !$normalized['valid']
                ) {

                    $warnings[] = [
                        'type' =>
                            'invalid_attendance',

                        'sheet' =>
                            $sheetName,

                        'row' =>
                            $row,

                        'student' =>
                            $name,

                        'date' =>
                            $date,

                        'value' =>
                            $normalized[
                                'original'
                            ]
                    ];


                    $attendance[$date] =
                        null;

                    continue;
                }


                $attendance[$date] =
                    $normalized['value'];
            }


            /* ---------------------------------------------
               Store Student
               --------------------------------------------- */

            $students[] = [

                'source_row' =>
                    $row,

                'section' =>
                    $sectionIndex + 1,

                'roll_no' =>
                    ($rollNo !== null && $rollNo !== '')
                        ? $rollNo
                        : null,

                'register_no' =>
                    (
                        $registerNo !== null &&
                        $registerNo !== ''
                    )
                        ? $registerNo
                        : null,

                'name' =>
                    $name,

                'attendance' =>
                    $attendance
            ];
        }
    }


    /* =====================================================
       ATTENDANCE SUMMARY
       ===================================================== */

    $counts = [
        'P' => 0,
        'A' => 0,
        'H' => 0,
        'blank' => 0
    ];


    foreach (
        $students
        as $student
    ) {

        foreach (
            $student['attendance']
            as $value
        ) {

            if ($value === null) {

                $counts['blank']++;
            }

            elseif (
                isset(
                    $counts[$value]
                )
            ) {

                $counts[$value]++;
            }
        }
    }


    /* =====================================================
       FINAL RESPONSE
       ===================================================== */

    respond([

        'status' =>
            'success',

        'filename' =>
            $file['name'],

        'sheet' =>
            $sheetName,

        'month' =>
            $monthInfo,

        'sections_found' =>
            count($sections),

        'students_found' =>
            count($students),

        'attendance_summary' =>
            $counts,

        'warning_count' =>
            count($warnings),

        'warnings' =>
            $warnings,

        'students' =>
            $students

    ]);

}


/* =========================================================
   ERROR HANDLER
   ========================================================= */

catch (Throwable $e) {

    respond([

        'status' =>
            'error',

        'message' =>
            'Could not convert Excel file.',

        'detail' =>
            $e->getMessage()

    ], 500);
}