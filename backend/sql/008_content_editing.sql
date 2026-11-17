-- =========================================================================
-- 008_content_editing.sql — superadmin can change the activities
-- -------------------------------------------------------------------------
-- 1. content_pretest_activities: the Pre-Test activities of Jr KG and Sr KG,
--    seeded with exactly the lists the portal uses today (26 + 26). Marks are
--    kept by POSITION (activity 1, 2, 3 …), so a position is never reused or
--    moved: new activities go at the end, old ones are retired (kept, hidden).
-- 2. observation_themes / observation_items get a "retired" marker (0 = in use).
-- 3. content_changes: every change — who, when, what it was, what it became.
-- Safe to run more than once.
-- =========================================================================
CREATE TABLE IF NOT EXISTS content_pretest_activities (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  level       VARCHAR(10)  NOT NULL,             -- 'Jr KG' | 'Sr KG'
  position    INT          NOT NULL,             -- 1, 2, 3 … (the activity number marks are saved under)
  type        VARCHAR(20)  NOT NULL,             -- 'Worksheet' | 'Classroom'
  activity    VARCHAR(255) NOT NULL,
  cg          VARCHAR(20)  NOT NULL,             -- e.g. 'CG 1.2'
  page        VARCHAR(20)  NOT NULL DEFAULT '—',
  retired     TINYINT(1)   NOT NULL DEFAULT 0,
  updated_by  INT          NULL,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_level_position (level, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO content_pretest_activities (level, position, type, activity, cg, page) VALUES
  ('Jr KG', 1, 'Worksheet', 'Tick the good hygiene habits', 'CG 1.2', '04'),
  ('Jr KG', 2, 'Worksheet', 'Circle the organised classroom habits', 'CG 1.3', '03'),
  ('Jr KG', 3, 'Worksheet', 'Tick the safe tools', 'CG 1.4', '04'),
  ('Jr KG', 4, 'Worksheet', 'Circle soft things', 'CG 2.5', '01'),
  ('Jr KG', 5, 'Worksheet', 'Circle your family members', 'CG 4.1', '04'),
  ('Jr KG', 6, 'Worksheet', 'Circle how you feel today', 'CG 4.2', '03'),
  ('Jr KG', 7, 'Worksheet', 'Circle the kind actions', 'CG 4.6', '04'),
  ('Jr KG', 8, 'Worksheet', 'Tick the children respecting others', 'CG 4.7', '03'),
  ('Jr KG', 9, 'Worksheet', 'Put same time objects together', 'CG 7.1', '02'),
  ('Jr KG', 10, 'Worksheet', 'Circle all the traced circles', 'CG 8.1', '03'),
  ('Jr KG', 11, 'Worksheet', 'Circle what comes next', 'CG 8.2', '01'),
  ('Jr KG', 12, 'Worksheet', 'Match the shape to object', 'CG 8.8', '02'),
  ('Jr KG', 13, 'Worksheet', 'Circle the heavy object', 'CG 8.9', '02'),
  ('Jr KG', 14, 'Worksheet', 'Tick the boy who is singing', 'CG 9.1', '01'),
  ('Jr KG', 15, 'Worksheet', 'Tick after doing each action', 'CG 9.4', '02'),
  ('Jr KG', 16, 'Worksheet', 'Trace the dotted lines', 'CG 10.8', '04'),
  ('Jr KG', 17, 'Worksheet', 'Make an artwork using any material', 'CG 12.1', '03'),
  ('Jr KG', 18, 'Worksheet', 'Tick the children who is working alone', 'CG 12.4', '02'),
  ('Jr KG', 19, 'Worksheet', 'Tick the child who has not completed the task', 'CG 13.1', '01'),
  ('Jr KG', 20, 'Worksheet', 'Circle what you want to explore', 'CG 13.3', '01'),
  ('Jr KG', 21, 'Classroom', 'Move Safely Game', 'CG 1.5', '—'),
  ('Jr KG', 22, 'Classroom', 'Touch and Tell Bag', 'CG 2.5', '—'),
  ('Jr KG', 23, 'Classroom', 'Carry and Walk Task', 'CG 3.4', '—'),
  ('Jr KG', 24, 'Classroom', 'Take Turn Game', 'CG 4.4', '—'),
  ('Jr KG', 25, 'Classroom', 'Which Tool for What?', 'CG 7.3', '—'),
  ('Jr KG', 26, 'Classroom', 'Count and Give', 'CG 8.3', '—'),
  ('Sr KG', 1, 'Worksheet', 'Circle the healthy food', 'CG 1', '2'),
  ('Sr KG', 2, 'Worksheet', 'Circle the dark colour', 'CG 2.1', '2'),
  ('Sr KG', 3, 'Worksheet', 'Look and remember', 'CG 2.2', '4'),
  ('Sr KG', 4, 'Worksheet', 'Circle loud sound', 'CG 2.3', '4'),
  ('Sr KG', 5, 'Worksheet', 'Circle things we taste', 'CG 2.4', '4'),
  ('Sr KG', 6, 'Worksheet', 'Circle hard objects', 'CG 2.5', '3'),
  ('Sr KG', 7, 'Worksheet', 'Circle the helpful actions', 'CG 5.1', '4'),
  ('Sr KG', 8, 'Worksheet', 'Match cause to effect', 'CG 7.2', '1'),
  ('Sr KG', 9, 'Worksheet', 'Arrange numbers from small to big', 'CG 8.4', '3'),
  ('Sr KG', 10, 'Worksheet', 'Match the number to the quantity', 'CG 8.5', '2'),
  ('Sr KG', 11, 'Worksheet', 'Circle the correct pictures', 'CG 8.12', '2'),
  ('Sr KG', 12, 'Worksheet', 'Circle the characters in the story', 'CG 9.5', '3'),
  ('Sr KG', 13, 'Worksheet', 'Name the pictures', 'CG 9.7', '1'),
  ('Sr KG', 14, 'Worksheet', 'Circle only letters', 'CG 10.3', '4'),
  ('Sr KG', 15, 'Worksheet', 'Read the word and point to the picture', 'CG 10.4', '2'),
  ('Sr KG', 16, 'Worksheet', 'Read and answer', 'CG 10.5', '3'),
  ('Sr KG', 17, 'Worksheet', 'Match the instructions', 'CG 10.7', '1'),
  ('Sr KG', 18, 'Worksheet', 'Match sound to the image', 'CG 11.1', '1'),
  ('Sr KG', 19, 'Worksheet', 'Circle the happy face', 'CG 12.3', '1'),
  ('Sr KG', 20, 'Worksheet', 'Tick good learning habits', 'CG 13.2', '3'),
  ('Sr KG', 21, 'Classroom', 'Move Safely Game', 'CG 1.5', '—'),
  ('Sr KG', 22, 'Classroom', 'Touch and Tell Bag', 'CG 2.5', '—'),
  ('Sr KG', 23, 'Classroom', 'Carry and Walk Task', 'CG 3.4', '—'),
  ('Sr KG', 24, 'Classroom', 'Take Turn Game', 'CG 4.4', '—'),
  ('Sr KG', 25, 'Classroom', 'Which Tool for What?', 'CG 7.3', '—'),
  ('Sr KG', 26, 'Classroom', 'Count and Give', 'CG 8.3', '—');

-- retired markers (added only if missing)
SET @db := DATABASE();
SET @s := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'observation_themes' AND COLUMN_NAME = 'retired') = 0,
  'ALTER TABLE observation_themes ADD COLUMN retired TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s := IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'observation_items' AND COLUMN_NAME = 'retired') = 0,
  'ALTER TABLE observation_items ADD COLUMN retired TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

CREATE TABLE IF NOT EXISTS content_changes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  changed_by  INT          NULL,
  changed_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  what        VARCHAR(40)  NOT NULL,             -- 'pretest' | 'observation_theme' | 'observation_item'
  ref         VARCHAR(80)  NOT NULL,             -- e.g. 'Sr KG #5', 'theme 12', 'item 88'
  action      VARCHAR(20)  NOT NULL,             -- 'update' | 'add' | 'retire' | 'restore'
  before_json TEXT         NULL,
  after_json  TEXT         NULL,
  KEY idx_when (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
