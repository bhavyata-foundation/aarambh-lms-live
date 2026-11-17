-- =========================================================================
-- 005_class_standards_and_logins.sql  (replaces 003 and 004)
-- Every class gets its standard (Junior KG / Senior KG), and every login
-- opens the right class. Built and tested on the 7 Oct export
-- (aarambh_lms (5).sql).
--
-- Rules used:
--   • Login N@bhavyatafoundation.com = Min No N in the School visit sheet.
--   • In each school the lower Min No is Jr KG, the next one Sr KG
--     (true for every pair the sheet confirmed; marked "pattern" below).
--   • A section with children but no teacher is its own class, taught by
--     the school's other teacher (one login, both sections).
--   • A school with only one class in the sheet has only that class.
--
-- Run on aarambh_lms_test first, then aarambh_lms (phpMyAdmin → SQL, or
-- Import). Safe to run twice: every step only changes rows that are still
-- in their old state. No child, mark or record is deleted. The only row
-- removed is Bhandup class #82, and only if it is completely empty.
-- =========================================================================

START TRANSACTION;

-- -------------------------------------------------------------------------
-- 1. STANDARD OF EVERY CLASS
-- -------------------------------------------------------------------------
-- From the sheet / earlier confirmations
UPDATE classes SET name = 'Junior KG' WHERE id = 47;  -- Triveni Sangam, Min 49
UPDATE classes SET name = 'Senior KG' WHERE id = 93;  -- Triveni Sangam, Min 50 (no teacher → Reena)
UPDATE classes SET name = 'Junior KG' WHERE id = 48;  -- Triveni demo account's class
UPDATE classes SET name = 'Senior KG' WHERE id = 49;  -- South Sewri, Min 52
UPDATE classes SET name = 'Junior KG' WHERE id = 50;  -- South Sewri, Min 51 (Shifa)
UPDATE classes SET name = 'Junior KG' WHERE id = 53;  -- Khernagar, Min 57 (BMC teacher)
UPDATE classes SET name = 'Senior KG' WHERE id = 54;  -- Khernagar, Min 58 (BMC teacher)
UPDATE classes SET name = 'Junior KG' WHERE id = 57;  -- Jogeshwari, Min 69
UPDATE classes SET name = 'Senior KG' WHERE id = 58;  -- Jogeshwari, Min 70 (no teacher → 69@)
UPDATE classes SET name = 'Senior KG' WHERE id = 61;  -- Nehru Nagar, Min 102
UPDATE classes SET name = 'Junior KG' WHERE id = 62;  -- Nehru Nagar, Min 101 (Rukhsar)
UPDATE classes SET name = 'Junior KG' WHERE id = 65;  -- Kajupada, Min 105
UPDATE classes SET name = 'Senior KG' WHERE id = 66;  -- Kajupada (Leenatha, BMC)
UPDATE classes SET name = 'Junior KG' WHERE id = 67;  -- S.G Barve Marg, Min 107
UPDATE classes SET name = 'Senior KG' WHERE id = 68;  -- S.G Barve Marg, Min 108 (Sana)
UPDATE classes SET name = 'Junior KG' WHERE id = 69;  -- Chunabhatti, Min 109
UPDATE classes SET name = 'Senior KG' WHERE id = 70;  -- Chunabhatti, Min 110 (Tasleem)
UPDATE classes SET name = 'Junior KG' WHERE id = 71;  -- Vikhroli Park Site, Min 85 (BMC teacher)
UPDATE classes SET name = 'Senior KG' WHERE id = 72;  -- Vikhroli Park Site, Min 86 (BMC teacher)
UPDATE classes SET name = 'Junior KG' WHERE id = 81;  -- Bhandup Tank Road, Min 2 (only class)
UPDATE classes SET name = 'Senior KG' WHERE id = 85;  -- Goshala, Min 36
UPDATE classes SET name = 'Junior KG' WHERE id = 86;  -- Goshala (Kiran Kamble, BMC)
UPDATE classes SET name = 'Junior KG' WHERE id = 87;  -- D D Upadhyay, Min 37
UPDATE classes SET name = 'Senior KG' WHERE id = 88;  -- D D Upadhyay, Min 38 (Hina)
UPDATE classes SET name = 'Junior KG' WHERE id = 89;  -- P.K. Road, Min 39 (Nilima)
UPDATE classes SET name = 'Senior KG' WHERE id = 90;  -- P.K. Road (BMC teacher)
-- Pattern: lower Min No = Jr KG (please tick these against the sheet)
UPDATE classes SET name = 'Junior KG' WHERE id = 51;  -- Shastri Nagar, Min 55
UPDATE classes SET name = 'Senior KG' WHERE id = 52;  -- Shastri Nagar, Min 56
UPDATE classes SET name = 'Junior KG' WHERE id = 55;  -- Juhu Gandhigram, Min 67
UPDATE classes SET name = 'Senior KG' WHERE id = 56;  -- Juhu Gandhigram, Min 68
UPDATE classes SET name = 'Junior KG' WHERE id = 59;  -- Andheri, Min 71
UPDATE classes SET name = 'Senior KG' WHERE id = 60;  -- Andheri, Min 72
UPDATE classes SET name = 'Junior KG' WHERE id = 63;  -- Mohili Village, Min 103
UPDATE classes SET name = 'Senior KG' WHERE id = 64;  -- Mohili Village, Min 104
UPDATE classes SET name = 'Junior KG' WHERE id = 73;  -- Maneklal Mehta, Min 87
UPDATE classes SET name = 'Senior KG' WHERE id = 74;  -- Maneklal Mehta, Min 88
UPDATE classes SET name = 'Junior KG' WHERE id = 75;  -- Barve Nagar, Min 89
UPDATE classes SET name = 'Senior KG' WHERE id = 76;  -- Barve Nagar, Min 90
UPDATE classes SET name = 'Junior KG' WHERE id = 77;  -- Sainath Nagar, Min 91
UPDATE classes SET name = 'Senior KG' WHERE id = 78;  -- Sainath Nagar, Min 92
UPDATE classes SET name = 'Junior KG' WHERE id = 79;  -- Rajawadi, Min 93
UPDATE classes SET name = 'Senior KG' WHERE id = 80;  -- Rajawadi, Min 94
UPDATE classes SET name = 'Junior KG' WHERE id = 83;  -- Nehru Nagar (Bhandup), Min 3
UPDATE classes SET name = 'Senior KG' WHERE id = 84;  -- Nehru Nagar (Bhandup), Min 4
UPDATE classes SET name = 'Junior KG' WHERE id = 91;  -- Mithagar, Min 41
UPDATE classes SET name = 'Senior KG' WHERE id = 92;  -- Mithagar, Min 42

-- -------------------------------------------------------------------------
-- 2. LOGINS THAT HAD NO CLASS (only where the class has no teacher yet)
-- -------------------------------------------------------------------------
UPDATE classes SET teacher_user_id = 110 WHERE id = 70 AND teacher_user_id IS NULL; -- Tasleem Shaikh → Chunabhatti Sr KG
UPDATE classes SET teacher_user_id = 38  WHERE id = 88 AND teacher_user_id IS NULL; -- Hina Kausar → D D Upadhyay Sr KG
UPDATE classes SET teacher_user_id = 51  WHERE id = 50 AND teacher_user_id IS NULL; -- Shifa Shaikh → South Sewri Jr KG
UPDATE classes SET teacher_user_id = 69  WHERE id = 58 AND teacher_user_id IS NULL; -- Jogeshwari Sr KG has no teacher → 69@ teaches both

-- -------------------------------------------------------------------------
-- 3. TRIVENI SANGAM: Jr KG (#47) and Sr KG (#93), both taught by Reena (49@)
-- -------------------------------------------------------------------------
-- The 10 Jr KG children sit on #93 today. Matched by number AND name, so
-- nothing else can move.
CREATE TEMPORARY TABLE IF NOT EXISTS tmp_triveni_jr (id INT PRIMARY KEY);
INSERT IGNORE INTO tmp_triveni_jr (id)
SELECT id FROM pupils
WHERE class_id = 93 AND id BETWEEN 24 AND 33
  AND name IN ('Shivanya Raonang','Mishti Jadhav','Vansh Patil','Swaraj Ghadigaokar','Shiv Tiwari',
               'Shairaj Uttarkar','Vidhan Pawar','Shagun Gupta','Devanshi Pande','Yash Shinde');

UPDATE classes SET teacher_user_id = 49 WHERE id IN (47, 93);

UPDATE pupils                 SET class_id = 47 WHERE class_id = 93 AND id       IN (SELECT id FROM tmp_triveni_jr);
UPDATE motor_assessment       SET class_id = 47 WHERE class_id = 93 AND pupil_id IN (SELECT id FROM tmp_triveni_jr);
UPDATE motor_assessment_notes SET class_id = 47 WHERE class_id = 93 AND pupil_id IN (SELECT id FROM tmp_triveni_jr);
UPDATE child_activity_ratings SET class_id = 47 WHERE class_id = 93 AND pupil_id IN (SELECT id FROM tmp_triveni_jr);
UPDATE attendance_followups   SET class_id = 47 WHERE class_id = 93 AND pupil_id IN (SELECT id FROM tmp_triveni_jr);
UPDATE student_holidays       SET class_id = 47 WHERE class_id = 93 AND pupil_id IN (SELECT id FROM tmp_triveni_jr);
-- (Observation, Workbook and attendance marks are stored per child: they follow the child.)

-- #93 was labelled Junior KG until now, so its class-level work was done
-- as Jr KG: it goes to the Jr KG class.
UPDATE teacher_daily_plans  SET class_id = 47 WHERE class_id = 93;
UPDATE session_evidence     SET class_id = 47 WHERE class_id = 93;
UPDATE materials            SET class_id = 47 WHERE class_id = 93;
UPDATE workbook_class_tally SET class_id = 47 WHERE class_id = 93;
UPDATE homework             SET class_id = 47 WHERE class_id = 93;
UPDATE effective_approvals  SET class_id = 47 WHERE class_id = 93;

DROP TEMPORARY TABLE IF EXISTS tmp_triveni_jr;

-- -------------------------------------------------------------------------
-- 4. DUPLICATE LOGINS 93@ and 107@
-- -------------------------------------------------------------------------
-- The correctly spelt login (the one on the class, and the one in Google
-- Workspace) gets the teacher's real name. The misspelt copy, which has
-- never saved anything, is switched off (not deleted).
UPDATE users SET name = 'Ankita Kadam'    WHERE id = 119 AND email = '93@bhavyatafoundation.com';
UPDATE users SET name = 'Khushboo Mulani' WHERE id = 118 AND email = '107@bhavyatafoundation.com';
UPDATE users SET status = 'inactive' WHERE id = 93  AND email = '93@bhvayatafoundation.com';
UPDATE users SET status = 'inactive' WHERE id = 107 AND email = '107@bhavayatafoundation.com';
UPDATE users SET status = 'inactive' WHERE id = 101 AND email = '101@bhavyatfoundation.com';

-- -------------------------------------------------------------------------
-- 5. BHANDUP TANK ROAD has only Jr KG (#81): remove #82, only if it is empty
-- -------------------------------------------------------------------------
DELETE FROM classes
WHERE id = 82 AND teacher_user_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM pupils               WHERE class_id = 82)
  AND NOT EXISTS (SELECT 1 FROM materials            WHERE class_id = 82)
  AND NOT EXISTS (SELECT 1 FROM motor_assessment     WHERE class_id = 82)
  AND NOT EXISTS (SELECT 1 FROM teacher_daily_plans  WHERE class_id = 82)
  AND NOT EXISTS (SELECT 1 FROM session_evidence     WHERE class_id = 82)
  AND NOT EXISTS (SELECT 1 FROM student_holidays     WHERE class_id = 82)
  AND NOT EXISTS (SELECT 1 FROM effective_approvals  WHERE class_id = 82)
  AND NOT EXISTS (SELECT 1 FROM ptm_meetings         WHERE class_id = 82)
  AND NOT EXISTS (SELECT 1 FROM events               WHERE class_id = 82)
  AND NOT EXISTS (SELECT 1 FROM homework             WHERE class_id = 82)
  AND NOT EXISTS (SELECT 1 FROM class_records        WHERE class_id = 82)
  AND NOT EXISTS (SELECT 1 FROM pretest_sessions     WHERE class_id = 82)
  AND NOT EXISTS (SELECT 1 FROM workbook_class_tally WHERE class_id = 82);

COMMIT;

-- -------------------------------------------------------------------------
-- CHECK: every class, its standard, its login and its children
-- -------------------------------------------------------------------------
SELECT s.name AS school, c.id AS class, c.name AS standard, u.email AS login, u.name AS teacher,
       (SELECT COUNT(*) FROM pupils p WHERE p.class_id = c.id AND p.active = 1) AS children
FROM classes c JOIN schools s ON s.id = c.school_id LEFT JOIN users u ON u.id = c.teacher_user_id
ORDER BY s.name, c.name, c.id;
