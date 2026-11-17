-- ============================================================================
-- Real pupils for Triveni Sangam Municipal School (school_id 1),
-- combined class (class_id 48) — Jr KG + Sr KG taught together.
--
-- Transcribed from a handwritten attendance register photo. Rows
-- marked with a comment were genuinely hard to read — PLEASE check
-- these against the real register before trusting them:
--   - Swaraj Ghadigaokar   (spelling uncertain)
--   - Shairaj Uttarkar     (spelling uncertain)
--   - Vidhan Pawar         (could be "Patoar" — unclear)
--   - Krushnai Rane        (spelling uncertain)
--   - Kaird Yadav          (likely "Kabir" — unclear)
--
-- admitted_date is set to the term start (2026-06-01) for all of
-- them, since these are existing enrolled children, not new
-- admissions — correct individual dates later for anyone who
-- actually joined mid-year, once real admission dates are known.
-- ============================================================================

INSERT INTO pupils (school_id, class_id, name, admitted_date, active) VALUES
(1, 48, 'Shivanya Raonang', '2026-06-01', 1),
(1, 48, 'Mishti Jadhav', '2026-06-01', 1),
(1, 48, 'Vansh Patil', '2026-06-01', 1),
(1, 48, 'Swaraj Ghadigaokar', '2026-06-01', 1),   -- spelling uncertain
(1, 48, 'Shiv Tiwari', '2026-06-01', 1),
(1, 48, 'Shairaj Uttarkar', '2026-06-01', 1),     -- spelling uncertain
(1, 48, 'Vidhan Pawar', '2026-06-01', 1),         -- could be "Patoar"
(1, 48, 'Shagun Gupta', '2026-06-01', 1),
(1, 48, 'Devanshi Pande', '2026-06-01', 1),
(1, 48, 'Yash Shinde', '2026-06-01', 1),
(1, 48, 'Dwarka Shinde', '2026-06-01', 1),
(1, 48, 'Krushnai Rane', '2026-06-01', 1),        -- spelling uncertain
(1, 48, 'Sneha Nivdunge', '2026-06-01', 1),
(1, 48, 'Avani Suryavanshi', '2026-06-01', 1),
(1, 48, 'Chaitanya Dangat', '2026-06-01', 1),
(1, 48, 'Riyansh Mahabal', '2026-06-01', 1),
(1, 48, 'Darsh Pande', '2026-06-01', 1),
(1, 48, 'Vedika Nirmal', '2026-06-01', 1),
(1, 48, 'Harshika Rathod', '2026-06-01', 1),
(1, 48, 'Vinayak Tadhav', '2026-06-01', 1),
(1, 48, 'Vidit Yadav', '2026-06-01', 1),
(1, 48, 'Kaird Yadav', '2026-06-01', 1);           -- likely "Kabir" — unclear