-- =========================================================================
-- class_records — small per-class labels and statuses that used to live
-- only in the teacher's browser. Photos are NOT stored here: only the
-- Google Drive link, file id and file name (the "label"), plus small
-- ticks/statuses. About 0.5 KB per row.
--
--   kind        what sort of record, e.g. 'effective' (Monthly Effective
--               month: register photo, scanned sheet, signatures,
--               salary status) or 'tlm_signed' (TLM "Signed" ticks)
--   record_key  which one, e.g. '2026-6' (July 2026) or 'all'
--   data        the record itself, as JSON
--
-- Run once in phpMyAdmin on aarambh_lms (and aarambh_lms_test).
-- Safe to run twice: it only creates the table if it isn't there.
-- =========================================================================
CREATE TABLE IF NOT EXISTS class_records (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  class_id        INT NOT NULL,
  kind            VARCHAR(40) NOT NULL,
  record_key      VARCHAR(60) NOT NULL,
  data            MEDIUMTEXT NOT NULL,
  updated_by      INT NULL,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_class_kind_key (class_id, kind, record_key),
  KEY idx_class_kind (class_id, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
