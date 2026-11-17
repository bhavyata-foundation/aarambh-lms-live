-- Teacher notes for Workbook Assessment and Classroom Observation.
CREATE TABLE IF NOT EXISTS assessment_teacher_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_user_id INT NOT NULL,
  pupil_id INT NOT NULL,
  assessment_type VARCHAR(20) NOT NULL,
  month VARCHAR(30) NOT NULL,
  context_id INT NOT NULL,
  note VARCHAR(1000) NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assessment_teacher_note (teacher_user_id, pupil_id, assessment_type, month, context_id),
  KEY idx_assessment_teacher_note_lookup (teacher_user_id, assessment_type, month, context_id),
  CONSTRAINT fk_assessment_teacher_note_pupil FOREIGN KEY (pupil_id) REFERENCES pupils(id)
);
