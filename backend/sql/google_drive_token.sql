-- ============================================================================
-- google_drive_tokens
--
-- One row per teacher. access_token expires every ~1 hour and gets
-- silently refreshed using refresh_token whenever an upload happens —
-- the teacher never has to reconnect once she's done it the first time.
--
-- refresh_token is only issued by Google on the FIRST consent (or any
-- consent where prompt=consent forces it, which google_oauth_start.php
-- below always sets) — that's why the callback keeps whatever refresh_token
-- it already has on file if Google doesn't send a new one.
-- ============================================================================

CREATE TABLE IF NOT EXISTS google_drive_tokens (
  teacher_user_id INT PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);