<?php
// =========================================================================
// backend/ai/ai_config.php — the AI photo reader's settings (SERVER ONLY)
// -------------------------------------------------------------------------
// Paste your Anthropic API key between the quotes below (from
// console.anthropic.com → API keys). Never put this key in a JS file,
// an email or a chat: whoever has it can use your paid account.
// =========================================================================
define('ANTHROPIC_API_KEY', 'PASTE_YOUR_ANTHROPIC_API_KEY_HERE');

// Which Claude model reads the photos. Sonnet is the best balance for
// handwritten registers; 'claude-haiku-5-5' is cheaper for clear, printed sheets.
define('ANTHROPIC_MODEL', 'claude-sonnet-5-5');

// The longest reply allowed (a full 31-day register of 40 children fits).
define('ANTHROPIC_MAX_TOKENS', 8000);
