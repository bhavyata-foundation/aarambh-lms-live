-- ============================================================================
-- Extends pupils with the admission-detail fields the existing
-- "Add an admission" form already collects, so consolidating into one
-- real table doesn't mean losing data the form was built to capture.
--
-- Run this AFTER pupils_schema.sql has already been run once.
-- ============================================================================

ALTER TABLE pupils
  ADD COLUMN address VARCHAR(255) NULL,
  ADD COLUMN dob DATE NULL,
  ADD COLUMN gender VARCHAR(20) NULL,
  ADD COLUMN specially_abled TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN prev_studied TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN prev_school VARCHAR(150) NULL,
  ADD COLUMN prev_standard VARCHAR(50) NULL,
  ADD COLUMN prev_board VARCHAR(100) NULL,
  ADD COLUMN prev_reason VARCHAR(255) NULL;