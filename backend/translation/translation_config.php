<?php

// =========================================================================
// AARAMBH TRANSLATION CONFIG
//
// FILE:
// backend/translation/translation_config.php
//
// IMPORTANT:
// - Keep this file server-side only.
// - Never put this API key inside JavaScript.
// - Do not upload this file to a public GitHub repository.
//
// Google Cloud Translation - Basic (v2) supports API-key authentication.
// =========================================================================


// -------------------------------------------------------------------------
// GOOGLE CLOUD TRANSLATION API KEY
// -------------------------------------------------------------------------
//
// Replace ONLY the text below with your real Google Cloud Translation
// API key.
//
// Example:
// define('GOOGLE_TRANSLATE_API_KEY', 'AIzaSy..............');
//
// -------------------------------------------------------------------------

define(
    'GOOGLE_TRANSLATE_API_KEY',
    'PASTE_YOUR_GOOGLE_TRANSLATE_API_KEY_HERE'
);


// -------------------------------------------------------------------------
// GOOGLE TRANSLATION ENDPOINT
// -------------------------------------------------------------------------

define(
    'GOOGLE_TRANSLATE_ENDPOINT',
    'https://translation.googleapis.com/language/translate/v2'
);


// -------------------------------------------------------------------------
// TIMEOUTS
// -------------------------------------------------------------------------

define(
    'TRANSLATE_CONNECT_TIMEOUT',
    8
);

define(
    'TRANSLATE_TOTAL_TIMEOUT',
    20
);

?>