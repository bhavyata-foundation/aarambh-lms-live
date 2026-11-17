-- =========================================================================
-- 006_sana_pretest_to_srkg.sql  (OPTIONAL — run only after 005, and only if
-- Sana confirms her marks follow the Sr KG Pre-Test sheet, worksheets 1–20)
--
-- S.G Barve Marg Sr KG (#68, Sana Ruksar Shaikh): her 760 Pre-Test marks
-- (38 children × worksheets 1–20) were saved while the class had no
-- standard, so they carry the Jr KG activity names and CGs. This puts the
-- Sr KG name, CG and page on each worksheet by its number. The B / P / A
-- marks themselves are NOT changed. Only rows that still carry a Jr KG
-- label are touched, so it is safe to run twice.
-- =========================================================================
START TRANSACTION;

CREATE TEMPORARY TABLE IF NOT EXISTS tmp_srkg (activity_no INT PRIMARY KEY, activity_name VARCHAR(255), cg_code VARCHAR(30), page_no VARCHAR(10));
DELETE FROM tmp_srkg;
INSERT INTO tmp_srkg (activity_no, activity_name, cg_code, page_no) VALUES
  (1, 'Circle the healthy food', 'CG 1', '2'),
  (2, 'Circle the dark colour', 'CG 2.1', '2'),
  (3, 'Look and remember', 'CG 2.2', '4'),
  (4, 'Circle loud sound', 'CG 2.3', '4'),
  (5, 'Circle things we taste', 'CG 2.4', '4'),
  (6, 'Circle hard objects', 'CG 2.5', '3'),
  (7, 'Circle the helpful actions', 'CG 5.1', '4'),
  (8, 'Match cause to effect', 'CG 7.2', '1'),
  (9, 'Arrange numbers from small to big', 'CG 8.4', '3'),
  (10, 'Match the number to the quantity', 'CG 8.5', '2'),
  (11, 'Circle the correct pictures', 'CG 8.12', '2'),
  (12, 'Circle the characters in the story', 'CG 9.5', '3'),
  (13, 'Name the pictures', 'CG 9.7', '1'),
  (14, 'Circle only letters', 'CG 10.3', '4'),
  (15, 'Read the word and point to the picture', 'CG 10.4', '2'),
  (16, 'Read and answer', 'CG 10.5', '3'),
  (17, 'Match the instructions', 'CG 10.7', '1'),
  (18, 'Match sound to the image', 'CG 11.1', '1'),
  (19, 'Circle the happy face', 'CG 12.3', '1'),
  (20, 'Tick good learning habits', 'CG 13.2', '3');

UPDATE pretest_activity_marks m
JOIN pretest_sessions s ON s.id = m.session_id
JOIN tmp_srkg k ON k.activity_no = m.activity_no
SET m.activity_name = k.activity_name, m.cg_code = k.cg_code, m.page_no = k.page_no
WHERE s.class_id = 68 AND m.activity_type = 'Worksheet' AND m.activity_no BETWEEN 1 AND 20
  AND m.activity_name <> k.activity_name;

DROP TEMPORARY TABLE IF EXISTS tmp_srkg;
COMMIT;

-- CHECK: each worksheet now with its Sr KG name, and the marks unchanged
SELECT m.activity_no, m.activity_name, m.cg_code, COUNT(*) AS marks,
       SUM(m.level_mark = 'E') AS B, SUM(m.level_mark = 'P') AS P, SUM(m.level_mark = 'A') AS A
FROM pretest_activity_marks m JOIN pretest_sessions s ON s.id = m.session_id
WHERE s.class_id = 68 GROUP BY m.activity_no, m.activity_name, m.cg_code ORDER BY m.activity_no;
