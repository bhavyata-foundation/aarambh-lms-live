MARKSHEET SCANNER — stand-alone, step 1 (8 Oct 2026)
Open:  https://<your server>/aarambh-lms/marksheet-scan.html
Changes nothing else: no database, no Workbook / Observation code, nothing saved to the portal.

Files
  marksheet-scan.html            the page (4 steps: photo · corners · grid · check)
  js/marksheet-scan/ms-core.js   image work: straighten from 4 corners, even light, find the grid,
                                 remove printed lines, cut each cell, measure each mark
  js/marksheet-scan/ms-read.js   reading: blank / B / P / A, Tesseract vote, "check" flag, learning
  js/marksheet-scan/ms-samples.js  3,087 built-in handwritten examples (generated)
  js/marksheet-scan/ms-ui.js     the screen
  Tesseract.js 7 loads from cdn.jsdelivr.net (optional; without internet the scan still works)

How each cell is read
  1. blank or marked — from the ink, with a per-cell black/white level (faint pencil still counts)
  2. B / P / A — nearest of the built-in examples + this teacher's own corrected marks (×3)
  3. Tesseract reads the single cleaned letter (B, P, A only) — a tie-breaker vote
  4. "check" (yellow) when under 90 % sure, when the mark is faint or broken, when a cell has
     only a trace of ink, or when the grid could not be matched to the printed lines
  Learning: "Marks are correct — remember my handwriting" keeps her marks on that device only.

Test results (synthetic phone photos: 8 handwriting styles, tilt, perspective, shadow, blur, noise)
  blank vs mark                                  555 / 555
  grid from the printed lines                    12 / 12
  real page in Chromium, corners dragged         237 / 240 right (98.8 %), 0 wrong without a flag
  handwriting style never seen, first sheet      95.3 % right (worst style 84.7 %)
  … after the teacher corrects ~24 marks         98.8 % (worst style 95.3 %)
  Tesseract alone on the same marks              35 %  (why it is only a vote)
  Corners: within ~1–2 % of the box width → 98–99 %. Further off → the grid drifts;
  if the lines can't confirm it, every cell is flagged and the page says so.

Not yet tested on real teachers' photos — send 5–10 real filled marksheets before relying on it.
Training tools (outside the web folder): marksheet-ocr-tools/ — make test sheets, extract
features, train and measure. To add real marks later, the same feature code (ms-core.js) is used.
