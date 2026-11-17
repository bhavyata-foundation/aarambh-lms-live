(function () {
    'use strict';

    let convertedData = null;
    let matchedMarks = [];
    let unmatchedStudents = [];

    function normalizeName(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
    }

    function qs(id) {
        return document.getElementById(id);
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function createImportPanel() {
        if (qs('aarambhAttendanceImportPanel')) {
            return;
        }

        const attendanceContainer =
            qs('classattendance-body') ||
            qs('attendance-body');

        if (!attendanceContainer) {
            return;
        }

        const panel = document.createElement('div');

        panel.id = 'aarambhAttendanceImportPanel';

        panel.style.cssText = `
            background:#fff;
            border:1px solid #e5e7eb;
            border-radius:12px;
            padding:18px;
            margin-bottom:18px;
            box-shadow:0 2px 8px rgba(0,0,0,.04);
        `;

        panel.innerHTML = `
            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:12px;
                flex-wrap:wrap;
            ">
                <div>
                    <div style="
                        font-size:16px;
                        font-weight:700;
                        margin-bottom:4px;
                    ">
                        Import Attendance Excel
                    </div>

                    <div style="
                        font-size:12.5px;
                        color:#6b7280;
                    ">
                        Upload an attendance workbook, preview it,
                        then confirm before saving.
                    </div>
                </div>

                <button
                    type="button"
                    id="aarambhOpenImportBtn"
                    style="
                        padding:9px 15px;
                        border:0;
                        border-radius:8px;
                        background:#2563eb;
                        color:#fff;
                        cursor:pointer;
                        font-weight:600;
                    "
                >
                    Import Excel
                </button>
            </div>

            <div
                id="aarambhImportBox"
                style="
                    display:none;
                    margin-top:16px;
                    border-top:1px solid #eee;
                    padding-top:16px;
                "
            >
                <div style="
                    display:flex;
                    gap:12px;
                    flex-wrap:wrap;
                    align-items:end;
                ">
                    <div>
                        <div style="
                            font-size:12px;
                            font-weight:600;
                            margin-bottom:5px;
                        ">
                            Excel file
                        </div>

                        <input
                            type="file"
                            id="aarambhAttendanceFile"
                            accept=".xlsx,.xls"
                        >
                    </div>

                    <div>
                        <div style="
                            font-size:12px;
                            font-weight:600;
                            margin-bottom:5px;
                        ">
                            Sheet
                        </div>

                        <select
                            id="aarambhAttendanceSheet"
                            style="
                                min-width:160px;
                                padding:7px;
                                border:1px solid #d1d5db;
                                border-radius:7px;
                            "
                        >
                            <option value="">
                                Upload and analyse first
                            </option>
                        </select>
                    </div>

                    <button
                        type="button"
                        id="aarambhAnalyseBtn"
                        style="
                            padding:8px 13px;
                            border:1px solid #d1d5db;
                            background:#fff;
                            border-radius:8px;
                            cursor:pointer;
                        "
                    >
                        Analyse
                    </button>

                    <button
                        type="button"
                        id="aarambhPreviewBtn"
                        style="
                            padding:8px 13px;
                            border:0;
                            background:#111827;
                            color:#fff;
                            border-radius:8px;
                            cursor:pointer;
                        "
                    >
                        Preview Import
                    </button>
                </div>

                <div
                    id="aarambhAttendanceImportResult"
                    style="margin-top:16px;"
                ></div>
            </div>
        `;

        attendanceContainer.prepend(panel);

        qs('aarambhOpenImportBtn')
            .addEventListener('click', function () {
                const box = qs('aarambhImportBox');

                box.style.display =
                    box.style.display === 'none'
                        ? 'block'
                        : 'none';
            });

        qs('aarambhAnalyseBtn')
            .addEventListener('click', analyseWorkbook);

        qs('aarambhPreviewBtn')
            .addEventListener('click', previewImport);
    }

    async function analyseWorkbook() {
        const input = qs('aarambhAttendanceFile');
        const result = qs('aarambhAttendanceImportResult');
        const select = qs('aarambhAttendanceSheet');

        if (!input || !input.files.length) {
            result.innerHTML =
                '<div style="color:#b91c1c;">Choose an Excel file first.</div>';
            return;
        }

        result.innerHTML =
            '<div>Analysing Excel...</div>';

        const formData = new FormData();

        formData.append(
            'file',
            input.files[0]
        );

        try {
            const response = await fetch(
                'backend/import/detect-format.php',
                {
                    method: 'POST',
                    body: formData
                }
            );

            const data = await response.json();

            if (data.status !== 'success') {
                result.innerHTML =
                    '<div style="color:#b91c1c;">' +
                    escapeHtml(
                        data.message || 'Could not analyse Excel.'
                    ) +
                    '</div>';

                return;
            }

            const sheets = (data.sheets || [])
                .filter(function (sheet) {
                    return (
                        sheet.sections_found > 0 &&
                        sheet.month
                    );
                });

            if (!sheets.length) {
                result.innerHTML =
                    '<div style="color:#b91c1c;">No attendance sheet was detected.</div>';
                return;
            }

            select.innerHTML = sheets.map(function (sheet) {
                return (
                    '<option value="' +
                    escapeHtml(sheet.sheet) +
                    '">' +
                    escapeHtml(sheet.sheet) +
                    ' — ' +
                    escapeHtml(sheet.month.month_key) +
                    '</option>'
                );
            }).join('');

            result.innerHTML =
                '<div style="color:#166534;">' +
                'Excel analysed successfully. ' +
                sheets.length +
                ' attendance sheet(s) found.' +
                '</div>';

        } catch (error) {
            result.innerHTML =
                '<div style="color:#b91c1c;">Could not analyse file.</div>';
        }
    }

    async function fetchPupils() {
        const response = await fetch(
            'backend/pupils/get_my_pupils.php' +
            window.location.search
        );

        const data = await response.json();

        if (data.status !== 'success') {
            throw new Error(
                data.message || 'Could not load pupils.'
            );
        }

        return data.pupils || [];
    }

    async function previewImport() {
        const input = qs('aarambhAttendanceFile');
        const sheet = qs('aarambhAttendanceSheet');
        const result = qs('aarambhAttendanceImportResult');

        if (!input || !input.files.length) {
            result.innerHTML =
                '<div style="color:#b91c1c;">Choose an Excel file first.</div>';
            return;
        }

        if (!sheet || !sheet.value) {
            result.innerHTML =
                '<div style="color:#b91c1c;">Analyse the workbook and select a sheet first.</div>';
            return;
        }

        result.innerHTML =
            '<div>Converting attendance and matching students...</div>';

        const formData = new FormData();

        formData.append(
            'file',
            input.files[0]
        );

        formData.append(
            'sheet',
            sheet.value
        );

        try {
            const responses = await Promise.all([
                fetch(
                    'backend/import/convert.php',
                    {
                        method: 'POST',
                        body: formData
                    }
                ),
                fetchPupils()
            ]);

            const conversion = await responses[0].json();
            const pupils = responses[1];

            if (conversion.status !== 'success') {
                result.innerHTML =
                    '<div style="color:#b91c1c;">' +
                    escapeHtml(
                        conversion.message ||
                        'Conversion failed.'
                    ) +
                    '</div>';

                return;
            }

            convertedData = conversion;

            buildMatchPreview(
                conversion,
                pupils
            );

        } catch (error) {
            result.innerHTML =
                '<div style="color:#b91c1c;">' +
                escapeHtml(error.message) +
                '</div>';
        }
    }

    function buildMatchPreview(conversion, pupils) {
        const result = qs('aarambhAttendanceImportResult');

        const pupilMap = {};

        pupils.forEach(function (pupil) {
            const key = normalizeName(pupil.name);

            if (!pupilMap[key]) {
                pupilMap[key] = [];
            }

            pupilMap[key].push(pupil);
        });

        matchedMarks = [];
        unmatchedStudents = [];

        let matchedStudents = 0;
        let holidayCells = 0;
        let blankCells = 0;
        let ambiguousStudents = 0;

        const previewRows = [];

        conversion.students.forEach(function (student) {
            const key = normalizeName(student.name);
            const matches = pupilMap[key] || [];

            if (matches.length !== 1) {
                if (matches.length > 1) {
                    ambiguousStudents++;
                }

                unmatchedStudents.push({
                    name: student.name,
                    reason:
                        matches.length > 1
                            ? 'Multiple Aarambh pupils have this name'
                            : 'No exact Aarambh name match'
                });

                previewRows.push(
                    '<tr>' +
                    '<td style="padding:7px;border-bottom:1px solid #eee;">' +
                    escapeHtml(student.name) +
                    '</td>' +
                    '<td style="padding:7px;border-bottom:1px solid #eee;color:#b91c1c;">Not matched</td>' +
                    '</tr>'
                );

                return;
            }

            const pupil = matches[0];

            matchedStudents++;

            Object.entries(
                student.attendance || {}
            ).forEach(function ([date, value]) {

                if (value === null) {
                    blankCells++;
                    return;
                }

                if (value === 'H') {
                    holidayCells++;
                    return;
                }

                if (value === 'P') {
                    matchedMarks.push({
                        pupil_id: Number(pupil.id),
                        date: date,
                        status: 'present'
                    });
                }

                if (value === 'A') {
                    matchedMarks.push({
                        pupil_id: Number(pupil.id),
                        date: date,
                        status: 'absent'
                    });
                }
            });

            previewRows.push(
                '<tr>' +
                '<td style="padding:7px;border-bottom:1px solid #eee;">' +
                escapeHtml(student.name) +
                '</td>' +
                '<td style="padding:7px;border-bottom:1px solid #eee;color:#166534;">Matched</td>' +
                '</tr>'
            );
        });

        const hasBlockingErrors =
            unmatchedStudents.length > 0;

        result.innerHTML = `
            <div style="
                background:#f8fafc;
                border-radius:10px;
                padding:14px;
            ">
                <div style="
                    display:grid;
                    grid-template-columns:repeat(auto-fit,minmax(130px,1fr));
                    gap:10px;
                    margin-bottom:14px;
                ">
                    ${statBox(
                        'Excel students',
                        conversion.students_found
                    )}

                    ${statBox(
                        'Matched',
                        matchedStudents
                    )}

                    ${statBox(
                        'Unmatched',
                        unmatchedStudents.length
                    )}

                    ${statBox(
                        'Marks ready',
                        matchedMarks.length
                    )}
                </div>

                ${
                    holidayCells
                        ? `
                        <div style="
                            background:#fff7ed;
                            color:#9a3412;
                            padding:10px 12px;
                            border-radius:8px;
                            margin-bottom:12px;
                        ">
                            ${holidayCells} H / Holiday cells detected.
                            Your current Aarambh attendance database
                            does not support a Holiday status yet,
                            so these will NOT be saved.
                        </div>
                        `
                        : ''
                }

                ${
                    unmatchedStudents.length
                        ? `
                        <div style="
                            background:#fef2f2;
                            color:#991b1b;
                            padding:10px 12px;
                            border-radius:8px;
                            margin-bottom:12px;
                        ">
                            ${unmatchedStudents.length}
                            student(s) are not safely matched.
                            They will not be imported.
                        </div>
                        `
                        : `
                        <div style="
                            background:#f0fdf4;
                            color:#166534;
                            padding:10px 12px;
                            border-radius:8px;
                            margin-bottom:12px;
                        ">
                            All students matched by exact normalized name.
                        </div>
                        `
                }

                <div style="
                    max-height:300px;
                    overflow:auto;
                    border:1px solid #e5e7eb;
                    background:#fff;
                    border-radius:8px;
                ">
                    <table style="
                        width:100%;
                        border-collapse:collapse;
                        font-size:12.5px;
                    ">
                        <thead>
                            <tr>
                                <th style="
                                    text-align:left;
                                    padding:8px;
                                    background:#f9fafb;
                                    position:sticky;
                                    top:0;
                                ">
                                    Excel Student
                                </th>

                                <th style="
                                    text-align:left;
                                    padding:8px;
                                    background:#f9fafb;
                                    position:sticky;
                                    top:0;
                                ">
                                    Aarambh Match
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            ${previewRows.join('')}
                        </tbody>
                    </table>
                </div>

                <div style="
                    display:flex;
                    gap:10px;
                    margin-top:14px;
                    flex-wrap:wrap;
                ">
                    <button
                        type="button"
                        id="aarambhConfirmImportBtn"
                        ${matchedMarks.length ? '' : 'disabled'}
                        style="
                            padding:9px 15px;
                            border:0;
                            border-radius:8px;
                            background:#16a34a;
                            color:#fff;
                            cursor:pointer;
                            font-weight:600;
                        "
                    >
                        Confirm Import (${matchedMarks.length} marks)
                    </button>

                    <button
                        type="button"
                        id="aarambhCancelImportBtn"
                        style="
                            padding:9px 15px;
                            border:1px solid #d1d5db;
                            border-radius:8px;
                            background:#fff;
                            cursor:pointer;
                        "
                    >
                        Cancel
                    </button>
                </div>
            </div>
        `;

        const confirm =
            qs('aarambhConfirmImportBtn');

        if (confirm) {
            confirm.addEventListener(
                'click',
                confirmImport
            );
        }

        const cancel =
            qs('aarambhCancelImportBtn');

        if (cancel) {
            cancel.addEventListener(
                'click',
                cancelImport
            );
        }
    }

    function statBox(label, value) {
        return `
            <div style="
                background:#fff;
                border:1px solid #e5e7eb;
                padding:10px;
                border-radius:8px;
            ">
                <div style="
                    font-size:11px;
                    color:#6b7280;
                ">
                    ${escapeHtml(label)}
                </div>

                <div style="
                    font-size:20px;
                    font-weight:700;
                ">
                    ${escapeHtml(value)}
                </div>
            </div>
        `;
    }

    async function confirmImport() {
        const result =
            qs('aarambhAttendanceImportResult');

        if (!matchedMarks.length) {
            result.innerHTML =
                '<div style="color:#b91c1c;">There are no attendance marks ready to save.</div>';
            return;
        }

        const ok = window.confirm(
            'Import ' +
            matchedMarks.length +
            ' attendance marks into Aarambh?'
        );

        if (!ok) {
            return;
        }

        result.innerHTML =
            '<div>Saving attendance...</div>';

        try {
            const response = await fetch(
                'backend/attendance/save_attendance.php' +
                window.location.search,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type':
                            'application/json'
                    },
                    body: JSON.stringify({
                        marks: matchedMarks
                    })
                }
            );

            const data =
                await response.json();

            if (data.status !== 'success') {
                result.innerHTML =
                    '<div style="color:#b91c1c;">' +
                    escapeHtml(
                        data.message ||
                        'Attendance import failed.'
                    ) +
                    '</div>';

                return;
            }

            result.innerHTML = `
                <div style="
                    background:#f0fdf4;
                    color:#166534;
                    padding:12px;
                    border-radius:8px;
                ">
                    Attendance import complete.
                    ${escapeHtml(data.saved || 0)}
                    marks saved.
                </div>
            `;

            convertedData = null;
            matchedMarks = [];
            unmatchedStudents = [];

            if (
                typeof window.renderAttendanceBody ===
                'function'
            ) {
                window.renderAttendanceBody();
            } else {
                setTimeout(function () {
                    window.location.reload();
                }, 800);
            }

        } catch (error) {
            result.innerHTML =
                '<div style="color:#b91c1c;">Could not save attendance.</div>';
        }
    }

    function cancelImport() {
        convertedData = null;
        matchedMarks = [];
        unmatchedStudents = [];

        const result =
            qs('aarambhAttendanceImportResult');

        if (result) {
            result.innerHTML =
                '<div style="color:#6b7280;">Import cancelled. Nothing was saved.</div>';
        }
    }

    function startObserver() {
        createImportPanel();

        const observer =
            new MutationObserver(function () {
                createImportPanel();
            });

        observer.observe(
            document.body,
            {
                childList: true,
                subtree: true
            }
        );
    }

    if (
        document.readyState ===
        'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            startObserver
        );
    } else {
        startObserver();
    }

})();