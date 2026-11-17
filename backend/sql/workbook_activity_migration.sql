-- ARAMBH Workbook Assessment: activity-level BPA model
-- Run this migration once before deploying the replacement PHP/JS files.

ALTER TABLE workbooks ADD COLUMN book_code VARCHAR(20) NULL;
CREATE UNIQUE INDEX uq_workbooks_book_code ON workbooks(book_code);

CREATE TABLE IF NOT EXISTS workbook_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  activity_code VARCHAR(40) NOT NULL,
  workbook_id INT NOT NULL,
  page_number INT NOT NULL,
  activity_no INT NOT NULL,
  activity_title TEXT NOT NULL,
  topic VARCHAR(255) NULL,
  cg_code VARCHAR(20) NOT NULL,
  cg_group VARCHAR(255) NULL,
  month_scheduled VARCHAR(30) NOT NULL,
  assessable TINYINT(1) NOT NULL DEFAULT 1,
  source_verified TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_workbook_activity_code (activity_code),
  KEY idx_workbook_page (workbook_id, page_number),
  KEY idx_workbook_month (workbook_id, month_scheduled),
  CONSTRAINT fk_workbook_activity_workbook FOREIGN KEY (workbook_id) REFERENCES workbooks(id)
);

CREATE TABLE IF NOT EXISTS workbook_page_scan_map (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workbook_id INT NOT NULL,
  page_number INT NOT NULL,
  scan_key VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_workbook_page_scan (workbook_id, page_number),
  UNIQUE KEY uq_scan_key (scan_key),
  CONSTRAINT fk_page_scan_workbook FOREIGN KEY (workbook_id) REFERENCES workbooks(id)
);

CREATE TABLE IF NOT EXISTS workbook_activity_assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pupil_id INT NOT NULL,
  activity_id INT NOT NULL,
  level_mark ENUM('B','P','A') NOT NULL,
  teacher_user_id INT NOT NULL,
  date_marked DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pupil_activity (pupil_id, activity_id),
  KEY idx_activity_assessment_activity (activity_id),
  KEY idx_activity_assessment_pupil (pupil_id),
  CONSTRAINT fk_activity_assessment_pupil FOREIGN KEY (pupil_id) REFERENCES pupils(id),
  CONSTRAINT fk_activity_assessment_activity FOREIGN KEY (activity_id) REFERENCES workbook_activities(id)
);

-- Add/update the verified Phase-1 book codes.
UPDATE workbooks SET book_code='JK-01' WHERE name='Khelika Balvatika 2';
UPDATE workbooks SET book_code='JK-02' WHERE name='Vaani Balvatika 2 (Phonics & Language)';
UPDATE workbooks SET book_code='JK-03' WHERE name='Vaani Alphabets';
UPDATE workbooks SET book_code='SK-01' WHERE name='Sopanika Balvatika 3';
UPDATE workbooks SET book_code='SK-02' WHERE name='Uvacha Balvatika 3 (Phonics and Language)';
UPDATE workbooks SET book_code='SK-03' WHERE name='Uvacha Balvatika 3 (Alphabets)';
