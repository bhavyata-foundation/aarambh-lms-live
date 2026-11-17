<?php
// =========================================================================
// SYNC CLASS PUPILS
//
// Import rules:
//
// 1. Register number is the primary identifier.
// 2. MIN number is the secondary identifier.
// 3. If both identifiers are missing, the row is NOT automatically added.
// 4. Such rows are returned in "needs_review" for teacher verification.
// 5. Existing pupils can be matched by register number, MIN number,
//    or an unambiguous normalized name.
// 6. Register/MIN conflicts are never silently merged.
// 7. Existing pupil IDs are preserved.
// 8. Inactive pupils are reactivated when correctly matched.
// =========================================================================

session_start();

header('Content-Type: application/json; charset=utf-8');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

ini_set('display_errors', '0');


require_once __DIR__ . '/../users/db_config.php';
require_once __DIR__ . '/pupil_helpers.php';


// =========================================================================
// INPUT
// =========================================================================

$input = json_decode(
    file_get_contents('php://input'),
    true
) ?? [];


$add = is_array($input['add'] ?? null)
    ? $input['add']
    : [];

$removeIds = is_array($input['remove_ids'] ?? null)
    ? $input['remove_ids']
    : [];

$registerUpdates = is_array($input['register_updates'] ?? null)
    ? $input['register_updates']
    : [];

$minUpdates = is_array($input['min_updates'] ?? null)
    ? $input['min_updates']
    : [];

$manualVerified = is_array($input['manual_verified'] ?? null)
    ? $input['manual_verified']
    : [];


// =========================================================================
// BASIC VALIDATION
// =========================================================================

if (
    !$add &&
    !$removeIds &&
    !$registerUpdates &&
    !$minUpdates &&
    !$manualVerified
) {
    pupil_json_error(
        400,
        'Nothing to synchronize.'
    );
}


if (
    count($add) > 1000 ||
    count($removeIds) > 1000 ||
    count($registerUpdates) > 1000 ||
    count($minUpdates) > 1000 ||
    count($manualVerified) > 1000
) {
    pupil_json_error(
        400,
        'One import can contain at most 1,000 pupil changes.'
    );
}


// =========================================================================
// INDEX HELPER
// =========================================================================

function sync_index_add(
    &$index,
    $key,
    $id
) {
    if (
        $key === null ||
        $key === ''
    ) {
        return;
    }


    if (!isset($index[$key])) {
        $index[$key] = [];
    }


    if (
        !in_array(
            $id,
            $index[$key],
            true
        )
    ) {
        $index[$key][] = $id;
    }
}


// =========================================================================
// MAIN
// =========================================================================

try {

    $conn = get_db_connection();


    // ---------------------------------------------------------
    // Verify teacher + class
    // ---------------------------------------------------------

    $class = pupil_authorized_class(
        $conn,
        $input['class_id'] ?? null
    );


    $classId = $class['id'];

    $schoolId = $class['school_id'];


    // ---------------------------------------------------------
    // Detect available columns
    // ---------------------------------------------------------

    $columns = pupil_column_set($conn);

    $hasRegister = isset(
        $columns['register_no']
    );

    $hasMin = isset(
        $columns['min_no']
    );

    $hasDob = isset(
        $columns['dob']
    );

    $hasGender = isset(
        $columns['gender']
    );


    // ---------------------------------------------------------
    // Load current class roster
    // ---------------------------------------------------------

    $select = '
        id,
        name,
        admitted_date,
        active
    ';


    $select .= $hasRegister
        ? ', register_no'
        : ', NULL AS register_no';


    $select .= $hasMin
        ? ', min_no'
        : ', NULL AS min_no';


    $select .= $hasDob
        ? ', dob'
        : ', NULL AS dob';


    $select .= $hasGender
        ? ', gender'
        : ', NULL AS gender';


    $stmt = $conn->prepare(
        "SELECT {$select}
         FROM pupils
         WHERE class_id = ?
         ORDER BY id"
    );


    $stmt->bind_param(
        'i',
        $classId
    );


    $stmt->execute();

    $result = $stmt->get_result();


    $records = [];

    $byName = [];

    $byRegister = [];

    $byMin = [];


    while (
        $row = $result->fetch_assoc()
    ) {

        $id = (int) $row['id'];

        $row['id'] = $id;

        $row['active'] = (int) $row['active'];


        $records[$id] = $row;


        // -------------------------
        // NAME INDEX
        // -------------------------

        sync_index_add(
            $byName,
            pupil_normalize_name(
                $row['name']
            ),
            $id
        );


        // -------------------------
        // REGISTER INDEX
        // -------------------------

        $register = pupil_clean_register_no(
            $row['register_no'] ?? ''
        );


        if ($register !== null) {

            sync_index_add(
                $byRegister,
                $register,
                $id
            );
        }


        // -------------------------
        // MIN INDEX
        // -------------------------

        $min = pupil_clean_min_no(
            $row['min_no'] ?? ''
        );


        if ($min !== null) {

            sync_index_add(
                $byMin,
                $min,
                $id
            );
        }
    }


    $stmt->close();


    // =========================================================================
    // INSERT STATEMENT
    // =========================================================================

    $insertFields = [
        'school_id',
        'class_id',
        'name',
        'admitted_date',
        'active'
    ];


    if ($hasRegister) {
        $insertFields[] = 'register_no';
    }


    if ($hasMin) {
        $insertFields[] = 'min_no';
    }


    if ($hasDob) {
        $insertFields[] = 'dob';
    }


    if ($hasGender) {
        $insertFields[] = 'gender';
    }


    $insertSql =
        'INSERT INTO pupils (`' .
        implode(
            '`, `',
            $insertFields
        ) .
        '`) VALUES (' .
        implode(
            ', ',
            array_fill(
                0,
                count($insertFields),
                '?'
            )
        ) .
        ')';


    $insert = $conn->prepare(
        $insertSql
    );


    // =========================================================================
    // COUNTERS
    // =========================================================================

    $added = 0;

    $reactivated = 0;

    $updated = 0;

    $unchanged = 0;

    $removed = 0;

    $registerUpdated = 0;

    $minUpdated = 0;


    $skipped = [];

    $needsReview = [];

    $seenImportKeys = [];


    $today = date('Y-m-d');


    // =========================================================================
    // TRANSACTION
    // =========================================================================

    $conn->begin_transaction();


    // =========================================================================
    // PROCESS IMPORTED PUPILS
    // =========================================================================

    foreach (
        $add as $i => $pupil
    ) {

        $rowNumber = $i + 2;


        // -----------------------------------------------------
        // Clean input
        // -----------------------------------------------------

        $name = pupil_clean_name(
            $pupil['name'] ?? ''
        );


        $nameKey = pupil_normalize_name(
            $name
        );


        $register = $hasRegister
            ? pupil_clean_register_no(
                $pupil['register_no'] ?? ''
            )
            : null;


        $min = $hasMin
            ? pupil_clean_min_no(
                $pupil['min_no'] ?? ''
            )
            : null;


        // -----------------------------------------------------
        // Manual verification flag
        //
        // Frontend can explicitly send:
        //
        // manual_verified: true
        //
        // when teacher has confirmed that a student with
        // missing identifier is genuinely this student.
        // -----------------------------------------------------

        $isManuallyVerified =
            !empty(
                $pupil['manual_verified']
            );


        // -----------------------------------------------------
        // Validate name
        // -----------------------------------------------------

        $nameLength =
            function_exists('mb_strlen')
                ? mb_strlen(
                    $name,
                    'UTF-8'
                )
                : strlen($name);


        if (
            $name === '' ||
            $nameLength > 150
        ) {

            $skipped[] =
                "Row {$rowNumber}: name is missing or too long.";

            continue;
        }


        // -----------------------------------------------------
        // Identifier status
        // -----------------------------------------------------

        $identifierStatus =
            pupil_identifier_status([
                'register_no' => $register,
                'min_no' => $min
            ]);


        // -----------------------------------------------------
        // BOTH IDENTIFIERS MISSING
        //
        // Do NOT automatically add this pupil.
        // Send to teacher review.
        // -----------------------------------------------------

        if (
            $identifierStatus ===
            'missing_both' &&
            !$isManuallyVerified
        ) {

            $needsReview[] = [
                'row' => $rowNumber,
                'name' => $name,
                'register_no' => null,
                'min_no' => null,
                'reason' =>
                    'Register number and MIN number are missing.',
                'requires_manual_verification' => true
            ];

            continue;
        }


        // -----------------------------------------------------
        // DUPLICATE IMPORT CHECK
        // -----------------------------------------------------

        $identityKey = null;


        if ($register !== null) {

            $identityKey =
                'r:' . $register;

        } elseif ($min !== null) {

            $identityKey =
                'm:' . $min;

        } else {

            $identityKey =
                'n:' . $nameKey;
        }


        if (
            isset(
                $seenImportKeys[$identityKey]
            )
        ) {

            $skipped[] =
                "Row {$rowNumber} ({$name}): repeated in the imported file.";

            continue;
        }


        $seenImportKeys[$identityKey] = true;


        // =========================================================================
        // FIND MATCH
        // =========================================================================

        $candidateIds = [];


        // -----------------------------------------------------
        // 1. Register number = strongest match
        // -----------------------------------------------------

        if (
            $register !== null &&
            isset($byRegister[$register])
        ) {

            $candidateIds =
                $byRegister[$register];

        }


        // -----------------------------------------------------
        // 2. MIN number = second strongest match
        // -----------------------------------------------------

        elseif (
            $min !== null &&
            isset($byMin[$min])
        ) {

            $candidateIds =
                $byMin[$min];

        }


        // -----------------------------------------------------
        // 3. Name = fallback only
        // -----------------------------------------------------

        elseif (
            isset($byName[$nameKey])
        ) {

            $candidateIds =
                $byName[$nameKey];
        }


        $candidateIds =
            array_values(
                array_unique(
                    $candidateIds
                )
            );


        // -----------------------------------------------------
        // Ambiguous name
        // -----------------------------------------------------

        if (
            count($candidateIds) > 1
        ) {

            $needsReview[] = [
                'row' => $rowNumber,
                'name' => $name,
                'register_no' => $register,
                'min_no' => $min,
                'reason' =>
                    'More than one existing pupil has this name. Teacher verification is required.',
                'requires_manual_verification' => true
            ];

            continue;
        }


        // =========================================================================
        // VALIDATE IDENTIFIER CONFLICTS
        // =========================================================================

        // Register belongs to another pupil.
        if ($register !== null) {

            $otherRegisterIds =
                array_values(
                    array_diff(
                        $byRegister[$register] ?? [],
                        $candidateIds
                    )
                );


            if ($otherRegisterIds) {

                $skipped[] =
                    "Row {$rowNumber} ({$name}): register number {$register} belongs to another pupil.";

                continue;
            }
        }


        // MIN belongs to another pupil.
        if ($min !== null) {

            $otherMinIds =
                array_values(
                    array_diff(
                        $byMin[$min] ?? [],
                        $candidateIds
                    )
                );


            if ($otherMinIds) {

                $skipped[] =
                    "Row {$rowNumber} ({$name}): MIN number {$min} belongs to another pupil.";

                continue;
            }
        }


        // =========================================================================
        // EXISTING PUPIL
        // =========================================================================

        if ($candidateIds) {

            $id =
                (int) $candidateIds[0];


            $current =
                $records[$id];


            // -----------------------------------------------------
            // Build UPDATE
            // -----------------------------------------------------

            $sets = [
                'name = ?',
                'active = 1'
            ];


            $types = 's';

            $values = [
                $name
            ];


            // Register
            if (
                $hasRegister &&
                $register !== null
            ) {

                $sets[] =
                    'register_no = ?';

                $types .= 's';

                $values[] =
                    $register;
            }


            // MIN
            if (
                $hasMin &&
                $min !== null
            ) {

                $sets[] =
                    'min_no = ?';

                $types .= 's';

                $values[] =
                    $min;
            }


            // DOB
            $dob = $hasDob
                ? pupil_valid_date_or_null(
                    $pupil['dob'] ?? ''
                )
                : null;


            if (
                $hasDob &&
                $dob !== null
            ) {

                $sets[] =
                    'dob = ?';

                $types .= 's';

                $values[] =
                    $dob;
            }


            // Gender
            $genderInput =
                trim(
                    (string) (
                        $pupil['gender'] ?? ''
                    )
                );


            $gender =
                (
                    $hasGender &&
                    in_array(
                        $genderInput,
                        ['Female', 'Male'],
                        true
                    )
                )
                    ? $genderInput
                    : null;


            if (
                $hasGender &&
                $gender !== null
            ) {

                $sets[] =
                    'gender = ?';

                $types .= 's';

                $values[] =
                    $gender;
            }


            $types .= 'ii';

            $values[] = $id;

            $values[] = $classId;


            $update =
                $conn->prepare(
                    'UPDATE pupils SET ' .
                    implode(
                        ', ',
                        $sets
                    ) .
                    ' WHERE id = ? AND class_id = ?'
                );


            pupil_bind_params(
                $update,
                $types,
                $values
            );


            $update->execute();


            $changed =
                $update->affected_rows > 0;


            $update->close();


            if (
                !$current['active']
            ) {

                $reactivated++;

            } elseif ($changed) {

                $updated++;

            } else {

                $unchanged++;
            }


            // -----------------------------------------------------
            // Update local indexes
            // -----------------------------------------------------

            $records[$id]['active'] = 1;

            $records[$id]['name'] = $name;


            if (
                $register !== null
            ) {

                $records[$id]['register_no'] =
                    $register;


                sync_index_add(
                    $byRegister,
                    $register,
                    $id
                );
            }


            if (
                $min !== null
            ) {

                $records[$id]['min_no'] =
                    $min;


                sync_index_add(
                    $byMin,
                    $min,
                    $id
                );
            }


            sync_index_add(
                $byName,
                $nameKey,
                $id
            );


            continue;
        }


        // =========================================================================
        // NEW PUPIL
        // =========================================================================
        // The same child in another spelling is already in this class (even if
        // taken off the roll): never create a second record for her — a sheet
        // uploaded again must not duplicate anyone. The teacher can confirm in
        // the import that it really is a different child ('confirmed_different').
        if (empty($pupil['confirmed_different'])) {
            $look = pupil_find_lookalike($records, $name);
            if ($look !== null) {
                $needsReview[] = [
                    'row' => $rowNumber,
                    'name' => $name,
                    'register_no' => $register,
                    'min_no' => $min,
                    'existing_id' => $look,
                    'existing_name' => $records[$look]['name'],
                    'reason' => 'Looks like "' . $records[$look]['name'] . '", already ' . ($records[$look]['active'] ? 'on the roll' : 'in this class (taken off the roll)') . ', spelled differently. Not added, so the same child is not on the roll twice.',
                    'requires_manual_verification' => true
                ];
                continue;
            }
        }

        $admitted =
            pupil_valid_date_or_null(
                $pupil['admitted_date'] ?? ''
            ) ?? $today;


        $dob = $hasDob
            ? pupil_valid_date_or_null(
                $pupil['dob'] ?? ''
            )
            : null;


        $genderInput =
            trim(
                (string) (
                    $pupil['gender'] ?? ''
                )
            );


        $gender =
            (
                $hasGender &&
                in_array(
                    $genderInput,
                    ['Female', 'Male'],
                    true
                )
            )
                ? $genderInput
                : null;


        // -----------------------------------------------------
        // New pupils with only name and no identifiers:
        // only allowed if teacher explicitly verified them.
        // -----------------------------------------------------

        if (
            $register === null &&
            $min === null &&
            !$isManuallyVerified
        ) {

            $needsReview[] = [
                'row' => $rowNumber,
                'name' => $name,
                'register_no' => null,
                'min_no' => null,
                'reason' =>
                    'This pupil has no Register/MIN number. Teacher verification is required before adding.',
                'requires_manual_verification' => true
            ];

            continue;
        }


        // -----------------------------------------------------
        // INSERT
        // -----------------------------------------------------

        $values = [
            $schoolId,
            $classId,
            $name,
            $admitted,
            1
        ];


        $types = 'iissi';


        if ($hasRegister) {

            $values[] =
                $register;

            $types .= 's';
        }


        if ($hasMin) {

            $values[] =
                $min;

            $types .= 's';
        }


        if ($hasDob) {

            $values[] =
                $dob;

            $types .= 's';
        }


        if ($hasGender) {

            $values[] =
                $gender;

            $types .= 's';
        }


        pupil_bind_params(
            $insert,
            $types,
            $values
        );


        $insert->execute();


        $id =
            (int) $insert->insert_id;


        $records[$id] = [
            'id' => $id,
            'name' => $name,
            'register_no' => $register,
            'min_no' => $min,
            'admitted_date' => $admitted,
            'dob' => $dob,
            'gender' => $gender,
            'active' => 1
        ];


        sync_index_add(
            $byName,
            $nameKey,
            $id
        );


        if (
            $register !== null
        ) {

            sync_index_add(
                $byRegister,
                $register,
                $id
            );
        }


        if (
            $min !== null
        ) {

            sync_index_add(
                $byMin,
                $min,
                $id
            );
        }


        $added++;
    }


    $insert->close();


    // =========================================================================
    // REGISTER UPDATES
    // =========================================================================

    if (
        $registerUpdates &&
        $hasRegister
    ) {

        $updateRegister =
            $conn->prepare(
                'UPDATE pupils
                 SET register_no = ?
                 WHERE id = ?
                 AND class_id = ?
                 AND active = 1'
            );


        foreach (
            $registerUpdates as $item
        ) {

            $id =
                filter_var(
                    $item['id'] ?? null,
                    FILTER_VALIDATE_INT
                );


            $register =
                pupil_clean_register_no(
                    $item['register_no'] ?? ''
                );


            if (
                !$id ||
                $register === null ||
                !isset($records[$id]) ||
                !$records[$id]['active']
            ) {
                continue;
            }


            $conflicts =
                array_values(
                    array_diff(
                        $byRegister[$register] ?? [],
                        [(int) $id]
                    )
                );


            if ($conflicts) {

                $skipped[] =
                    "Register number {$register} is already in use; it was not changed for {$records[$id]['name']}.";

                continue;
            }


            $updateRegister->bind_param(
                'sii',
                $register,
                $id,
                $classId
            );


            $updateRegister->execute();


            $registerUpdated +=
                $updateRegister->affected_rows;


            if (
                $updateRegister->affected_rows
            ) {

                $records[$id]['register_no'] =
                    $register;


                sync_index_add(
                    $byRegister,
                    $register,
                    (int) $id
                );
            }
        }


        $updateRegister->close();
    }


    // =========================================================================
    // MIN UPDATES
    // =========================================================================

    if (
        $minUpdates &&
        $hasMin
    ) {

        $updateMin =
            $conn->prepare(
                'UPDATE pupils
                 SET min_no = ?
                 WHERE id = ?
                 AND class_id = ?
                 AND active = 1'
            );


        foreach (
            $minUpdates as $item
        ) {

            $id =
                filter_var(
                    $item['id'] ?? null,
                    FILTER_VALIDATE_INT
                );


            $min =
                pupil_clean_min_no(
                    $item['min_no'] ?? ''
                );


            if (
                !$id ||
                $min === null ||
                !isset($records[$id]) ||
                !$records[$id]['active']
            ) {
                continue;
            }


            $conflicts =
                array_values(
                    array_diff(
                        $byMin[$min] ?? [],
                        [(int) $id]
                    )
                );


            if ($conflicts) {

                $skipped[] =
                    "MIN number {$min} is already in use; it was not changed for {$records[$id]['name']}.";

                continue;
            }


            $updateMin->bind_param(
                'sii',
                $min,
                $id,
                $classId
            );


            $updateMin->execute();


            $minUpdated +=
                $updateMin->affected_rows;


            if (
                $updateMin->affected_rows
            ) {

                $records[$id]['min_no'] =
                    $min;


                sync_index_add(
                    $byMin,
                    $min,
                    (int) $id
                );
            }
        }


        $updateMin->close();
    }


    // =========================================================================
    // REMOVE PUPILS
    // =========================================================================

    $removeIds =
        array_values(
            array_unique(
                array_filter(
                    array_map(
                        'intval',
                        $removeIds
                    )
                )
            )
        );


    if ($removeIds) {

        $remove =
            $conn->prepare(
                'UPDATE pupils
                 SET active = 0
                 WHERE id = ?
                 AND class_id = ?
                 AND active = 1'
            );


        foreach (
            $removeIds as $id
        ) {

            $remove->bind_param(
                'ii',
                $id,
                $classId
            );


            $remove->execute();


            $removed +=
                $remove->affected_rows;
        }


        $remove->close();
    }


    // =========================================================================
    // COMMIT
    // =========================================================================

    $conn->commit();


    // =========================================================================
    // RETURN CURRENT ROSTER
    // =========================================================================

    $roster =
        pupil_active_roster(
            $conn,
            $classId,
            $columns
        );


    $conn->close();


    echo json_encode(
        [
            'status' => 'success',

            'class_id' => $classId,

            'school_id' => $schoolId,

            'added' => $added,

            'reactivated' => $reactivated,

            'updated' => $updated,

            'unchanged' => $unchanged,

            'removed' => $removed,

            'register_updated' =>
                $registerUpdated,

            'min_updated' =>
                $minUpdated,

            'skipped' =>
                $skipped,

            // IMPORTANT:
            // These rows are NOT silently inserted.
            // The frontend must show them to the teacher.
            'needs_review' =>
                $needsReview,

            'pupils' =>
                $roster
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );


} catch (Throwable $e) {

    if (isset($conn)) {

        try {
            $conn->rollback();
        } catch (Throwable $ignored) {
        }


        try {
            $conn->close();
        } catch (Throwable $ignored) {
        }
    }


    error_log(
        'sync_class_pupils failed: ' .
        $e->getMessage()
    );


    pupil_json_error(
        500,
        'The class roster could not be synchronized. No partial roster change was kept.'
    );
}