-- Run once against the real database before deploying
-- get_workbook_competency_assessment.php / save_workbook_competency_assessment.php.
--
-- Per-pupil marks — one row per (pupil, competency). Distinct from
-- workbook_competency_tally, which holds class-wide counts.

CREATE TABLE IF NOT EXISTS workbook_competency_assessment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pupil_id INT NOT NULL,
  workbook_competency_id INT NOT NULL,
  level_mark ENUM('E', 'P', 'A') NOT NULL,
  date_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_pupil_competency (pupil_id, workbook_competency_id),
  FOREIGN KEY (pupil_id) REFERENCES pupils(id),
  FOREIGN KEY (workbook_competency_id) REFERENCES workbook_competencies(id)
);
