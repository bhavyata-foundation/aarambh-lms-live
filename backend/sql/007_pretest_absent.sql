-- =========================================================================
-- 007_pretest_absent.sql
-- Pre-Test: a child can be marked ABSENT for one activity ("AB"), so the
-- list says "Absent for this activity — not evaluated" instead of leaving
-- it looking forgotten. AB is never counted as B, P or A (class totals,
-- DSI, SRI, CG summary, the child's %), and is not lost on reload.
-- Safe to run twice; changes no existing mark.
-- =========================================================================
ALTER TABLE pretest_activity_marks
  MODIFY level_mark ENUM('B','P','A','AB') NOT NULL;
