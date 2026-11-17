CREATE TABLE IF NOT EXISTS pretest_sessions (
  id INT NOT NULL AUTO_INCREMENT,
  class_id INT NOT NULL,
  pupil_id INT NOT NULL,
  term ENUM('TERM_1','TERM_2') NOT NULL DEFAULT 'TERM_1',
  assessment_date DATE NULL,
  attendance_status ENUM('PRESENT','ABSENT','NOT_MARKED') NOT NULL DEFAULT 'NOT_MARKED',
  created_by INT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pretest_session (class_id, pupil_id, term),
  KEY idx_pretest_class_term (class_id, term),
  KEY idx_pretest_pupil (pupil_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pretest_activity_marks (
  id INT NOT NULL AUTO_INCREMENT,
  session_id INT NOT NULL,
  activity_no TINYINT UNSIGNED NOT NULL,
  activity_type VARCHAR(20) NOT NULL,
  activity_name VARCHAR(255) NOT NULL,
  cg_code VARCHAR(30) NOT NULL,
  page_no VARCHAR(10) NULL,
  level_mark ENUM('B','P','A') NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pretest_activity_mark (session_id, activity_no),
  KEY idx_pretest_activity_cg (cg_code),
  CONSTRAINT fk_pretest_mark_session FOREIGN KEY (session_id) REFERENCES pretest_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
