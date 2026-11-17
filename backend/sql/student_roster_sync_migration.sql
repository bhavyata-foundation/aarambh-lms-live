-- Run once in phpMyAdmin before deploying the synchronized roster importer.
-- ADD COLUMN IF NOT EXISTS is supported by the MariaDB version bundled with
-- current XAMPP releases. Existing pupil data is preserved.

ALTER TABLE pupils
  ADD COLUMN IF NOT EXISTS register_no VARCHAR(20) NULL AFTER class_id,
  ADD COLUMN IF NOT EXISTS address VARCHAR(255) NULL AFTER active,
  ADD COLUMN IF NOT EXISTS dob DATE NULL AFTER address,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20) NULL AFTER dob,
  ADD COLUMN IF NOT EXISTS specially_abled TINYINT(1) NOT NULL DEFAULT 0 AFTER gender,
  ADD COLUMN IF NOT EXISTS prev_studied TINYINT(1) NOT NULL DEFAULT 0 AFTER specially_abled,
  ADD COLUMN IF NOT EXISTS prev_school VARCHAR(200) NULL AFTER prev_studied,
  ADD COLUMN IF NOT EXISTS prev_standard VARCHAR(80) NULL AFTER prev_school,
  ADD COLUMN IF NOT EXISTS prev_board VARCHAR(100) NULL AFTER prev_standard,
  ADD COLUMN IF NOT EXISTS prev_reason VARCHAR(255) NULL AFTER prev_board,
  ADD COLUMN IF NOT EXISTS receipt_drive_link TEXT NULL AFTER prev_reason,
  ADD COLUMN IF NOT EXISTS receipt_drive_file_id VARCHAR(255) NULL AFTER receipt_drive_link;
