-- ============================================================
-- AARAMBH LMS — FORMAL EXAM ASSESSMENT
-- One record per child + term + exam + subject.
-- ============================================================

CREATE TABLE IF NOT EXISTS exam_assessments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_id INT NOT NULL,
  pupil_id INT NOT NULL,
  term ENUM('Term 1','Term 2') NOT NULL,
  exam_name VARCHAR(150) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  exam_date DATE NOT NULL,
  max_marks DECIMAL(8,2) NOT NULL,
  obtained_marks DECIMAL(8,2) NULL,
  present TINYINT(1) NOT NULL DEFAULT 1,
  level ENUM('B','P','A') NULL,
  notes VARCHAR(500) NULL,
  updated_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_exam_child_subject (class_id, pupil_id, term, exam_name, subject),
  KEY idx_exam_class_term (class_id, term),
  KEY idx_exam_pupil (pupil_id),
  CONSTRAINT fk_exam_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_pupil FOREIGN KEY (pupil_id) REFERENCES pupils(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
