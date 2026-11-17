# Aarambh LMS — where things go

Pages stay at the top: index.html (login), teacher.html, supervisor.html,
principal.html, superadmin.html, parent.html, textbooks.html.

| Folder | What lives there |
|---|---|
| assets/ | logo.png, icons, fonts |
| templates/ | import templates teachers download |
| js/ | shared scripts (grade-scale, class-records, import-class-filter, assess-import-checks, pdf-branding, hide-ref-codes, test-mode-banner, main.js) |
| js/teacher/ | teacher-part-01 … 14 (only here — never in the top folder) |
| js/render/ | screens: myday, materials, events-evidence, transition … |
| js/weeks/ | weeks-core + week files |
| backend/<area>/ | one folder per area: auth, users, schools, pupils, attendance, assessment/*, daily_plan, materials, drive, effective, records, teacher_leave |
| backend/sql/ | database changes, numbered 001_, 002_ … (blocked from the web) |
| backend/dev/ | test-mode switch (works on localhost only) |
| docs/ | this file |

Rules
- Back up OUTSIDE htdocs (e.g. C:\aarambh-backups\), never as .bak inside it.
- One copy of each file, in its folder. Copies in the top folder are never loaded.
- teacher.html loads the part files in order; line 2 of each part names it.
- .htaccess (top folder) blocks backups, setup files, database scripts and folder listings.
