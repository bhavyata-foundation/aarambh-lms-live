-- ============================================================================
-- daily_attendance
--
-- One row per (pupil, date) actually marked. No row = not marked yet,
-- not "absent" — same distinction the app's UI already relies on
-- (a day only counts as "marked" once at least one child has a real
-- status recorded for it).
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pupil_id INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('present','absent') NOT NULL,
  marked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_pupil_date (pupil_id, date)
);