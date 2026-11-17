-- ============================================================================
-- pupils
--
-- The real student roster — replaces the hardcoded SAMPLE_STUDENTS
-- array in teacher.js entirely, eventually. This table is the
-- foundation; attendance, assessment, and family_records all need to
-- migrate to reference pupil_id once this exists, but that's separate
-- work after this is confirmed working.
-- ============================================================================

CREATE TABLE IF NOT EXISTS pupils (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_id INT NOT NULL,
  class_id INT NOT NULL,
  register_no VARCHAR(20) NULL,
  name VARCHAR(150) NOT NULL,
  admitted_date DATE NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,   -- soft-delete flag, never hard-delete a real child's record
  address VARCHAR(255) NULL,
  dob DATE NULL,
  gender VARCHAR(20) NULL,
  specially_abled TINYINT(1) NOT NULL DEFAULT 0,
  prev_studied TINYINT(1) NOT NULL DEFAULT 0,
  prev_school VARCHAR(200) NULL,
  prev_standard VARCHAR(80) NULL,
  prev_board VARCHAR(100) NULL,
  prev_reason VARCHAR(255) NULL,
  receipt_drive_link TEXT NULL,
  receipt_drive_file_id VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pupils_class_active (class_id, active),
  INDEX idx_pupils_class_register (class_id, register_no)
);
