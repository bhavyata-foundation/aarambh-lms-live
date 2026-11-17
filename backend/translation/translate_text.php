<?php

// =========================================================================
// AARAMBH — TRANSLATE TEXT
//
// FILE:
// backend/translation/translate_text.php
//
// PURPOSE:
//
// Receives text produced by browser speech recognition:
//
// Marathi speech
//      ↓
// Marathi text
//      ↓
// THIS PHP FILE
//      ↓
// English / Hindi / Marathi translation
//
// Supported languages:
//
// en = English
// hi = Hindi
// mr = Marathi
// gu = Gujarati
//
// Google API key remains on the server.
// =========================================================================


// -------------------------------------------------------------------------
// CLEAN JSON ERROR HANDLING
// -------------------------------------------------------------------------

set_exception_handler(function ($e) {

    http_response_code(500);

    header(
        'Content-Type: application/json; charset=utf-8'
    );

    echo json_encode(
        [
            'status'  => 'error',
            'message' => 'Translation server error.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
});


ini_set(
    'display_errors',
    '0'
);


// -------------------------------------------------------------------------
// SESSION
// -------------------------------------------------------------------------

session_start();


header(
    'Content-Type: application/json; charset=utf-8'
);


// -------------------------------------------------------------------------
// ONLY POST REQUESTS
// -------------------------------------------------------------------------

if (
    ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST'
) {

    http_response_code(405);

    echo json_encode(
        [
            'status'  => 'error',
            'message' => 'POST request required.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// -------------------------------------------------------------------------
// AUTHENTICATION
//
// Localhost development bypass (?dev_role=teacher).
//
// SECURITY: this is decided from the TCP peer address (REMOTE_ADDR), which
// the client cannot forge. It used to be decided from the Host header,
// which any client can set to "localhost" - on a live server that let
// anyone use this endpoint (and the paid Google Translate quota) without
// logging in.
//
// If the site sits behind a reverse proxy running on the same machine,
// REMOTE_ADDR is always 127.0.0.1, so we also refuse the bypass whenever
// a forwarding header is present.
// -------------------------------------------------------------------------

$isLocalRequest = (
    in_array(
        $_SERVER['REMOTE_ADDR'] ?? '',
        [
            '127.0.0.1',
            '::1'
        ],
        true
    ) &&
    empty($_SERVER['HTTP_X_FORWARDED_FOR']) &&
    empty($_SERVER['HTTP_X_REAL_IP']) &&
    empty($_SERVER['HTTP_FORWARDED'])
);


$devRole = (
    $isLocalRequest &&
    isset($_GET['dev_role'])
)
    ? $_GET['dev_role']
    : null;


$effectiveRole =
    $_SESSION['role'] ?? $devRole;


// Teacher voice input only for now.

if (
    $effectiveRole !== 'teacher'
) {

    http_response_code(401);

    echo json_encode(
        [
            'status'  => 'error',
            'message' => 'Not authorized.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// -------------------------------------------------------------------------
// LOAD TRANSLATION CONFIG
// -------------------------------------------------------------------------

require_once __DIR__ . '/translation_config.php';


// -------------------------------------------------------------------------
// VERIFY CONFIG
// -------------------------------------------------------------------------

if (
    !defined('GOOGLE_TRANSLATE_API_KEY') ||
    GOOGLE_TRANSLATE_API_KEY === '' ||
    GOOGLE_TRANSLATE_API_KEY ===
        'PASTE_YOUR_GOOGLE_TRANSLATE_API_KEY_HERE'
) {

    http_response_code(500);

    echo json_encode(
        [
            'status'  => 'error',
            'message' =>
                'Google Translation API key has not been configured.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// -------------------------------------------------------------------------
// READ JSON BODY
// -------------------------------------------------------------------------

$rawInput =
    file_get_contents(
        'php://input'
    );


$input =
    json_decode(
        $rawInput,
        true
    );


if (
    !is_array($input)
) {

    http_response_code(400);

    echo json_encode(
        [
            'status'  => 'error',
            'message' => 'Invalid JSON request.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// -------------------------------------------------------------------------
// GET VALUES
// -------------------------------------------------------------------------

$text =
    trim(
        (string)(
            $input['text'] ?? ''
        )
    );


$source =
    strtolower(
        trim(
            (string)(
                $input['source'] ?? 'auto'
            )
        )
    );


$target =
    strtolower(
        trim(
            (string)(
                $input['target'] ?? ''
            )
        )
    );


// -------------------------------------------------------------------------
// TEXT REQUIRED
// -------------------------------------------------------------------------

if (
    $text === ''
) {

    http_response_code(400);

    echo json_encode(
        [
            'status'  => 'error',
            'message' => 'Text is required.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// -------------------------------------------------------------------------
// TEXT LENGTH PROTECTION
// -------------------------------------------------------------------------

if (
    mb_strlen(
        $text,
        'UTF-8'
    ) > 5000
) {

    http_response_code(400);

    echo json_encode(
        [
            'status'  => 'error',
            'message' =>
                'Text is too long. Maximum 5000 characters.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// -------------------------------------------------------------------------
// SUPPORTED LANGUAGES
// -------------------------------------------------------------------------

$allowedSources = [
    'auto',
    'en',
    'hi',
    'mr',
    'gu'
];


$allowedTargets = [
    'en',
    'hi',
    'mr',
    'gu'
];


if (
    !in_array(
        $source,
        $allowedSources,
        true
    )
) {

    http_response_code(400);

    echo json_encode(
        [
            'status'  => 'error',
            'message' =>
                'Unsupported source language.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


if (
    !in_array(
        $target,
        $allowedTargets,
        true
    )
) {

    http_response_code(400);

    echo json_encode(
        [
            'status'  => 'error',
            'message' =>
                'Unsupported target language.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// -------------------------------------------------------------------------
// IF SOURCE AND TARGET ARE SAME
//
// No reason to call Google.
// -------------------------------------------------------------------------

if (
    $source !== 'auto' &&
    $source === $target
) {

    echo json_encode(
        [
            'status'                   => 'success',
            'translated_text'          => $text,
            'source_language'          => $source,
            'target_language'          => $target,
            'detected_source_language' => $source,
            'translated'               => false
        ],
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    );

    exit;
}


// -------------------------------------------------------------------------
// RATE LIMIT (per login session)
//
// Every call below this point costs money, so cap it:
//   - max 20 translation requests per minute
//   - max 60,000 characters per hour
// Limits are generous for real teachers (one request per dictation) and
// stop a runaway script or stolen session from burning the quota.
// Also see: set a daily quota cap in Google Cloud Console.
//
// The session is released (session_write_close) before the slow Google
// call, so other requests from the same teacher aren't blocked behind it.
// -------------------------------------------------------------------------

$rateNow         = time();
$rateWindowSecs  = 60;
$rateMaxRequests = 20;
$charWindowSecs  = 3600;
$charMaxPerHour  = 60000;

$recentHits = array_values(
    array_filter(
        (array)($_SESSION['translate_hits'] ?? []),
        function ($t) use ($rateNow, $rateWindowSecs) {
            return is_int($t) && $t > $rateNow - $rateWindowSecs;
        }
    )
);

$charBudget = (array)($_SESSION['translate_chars'] ?? []);

if (
    !isset($charBudget['start'], $charBudget['used']) ||
    $charBudget['start'] <= $rateNow - $charWindowSecs
) {
    $charBudget = [
        'start' => $rateNow,
        'used'  => 0
    ];
}

$textLength = mb_strlen($text, 'UTF-8');

if (
    count($recentHits) >= $rateMaxRequests ||
    ($charBudget['used'] + $textLength) > $charMaxPerHour
) {

    session_write_close();

    http_response_code(429);

    header('Retry-After: ' . $rateWindowSecs);

    echo json_encode(
        [
            'status'  => 'error',
            'message' =>
                'Too many translation requests. Please wait a minute and try again.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}

$recentHits[]                = $rateNow;
$charBudget['used']         += $textLength;
$_SESSION['translate_hits']  = $recentHits;
$_SESSION['translate_chars'] = $charBudget;

session_write_close();


// -------------------------------------------------------------------------
// CURL REQUIRED
// -------------------------------------------------------------------------

if (
    !function_exists('curl_init')
) {

    http_response_code(500);

    echo json_encode(
        [
            'status'  => 'error',
            'message' =>
                'PHP cURL extension is not enabled.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// -------------------------------------------------------------------------
// BUILD GOOGLE REQUEST
//
// q      = text
// target = target language
// source = optional
// format = plain text
//
// If source=auto we simply omit source and Google detects it.
// -------------------------------------------------------------------------

$requestBody = [
    'q'      => $text,
    'target' => $target,
    'format' => 'text'
];


if (
    $source !== 'auto'
) {

    $requestBody['source'] =
        $source;
}


// -------------------------------------------------------------------------
// CREATE CURL REQUEST
// -------------------------------------------------------------------------

$ch =
    curl_init(
        GOOGLE_TRANSLATE_ENDPOINT
    );


curl_setopt(
    $ch,
    CURLOPT_POST,
    true
);


curl_setopt(
    $ch,
    CURLOPT_RETURNTRANSFER,
    true
);


curl_setopt(
    $ch,
    CURLOPT_HTTPHEADER,
    [
        'Content-Type: application/json; charset=utf-8',

        // Safer than putting the API key in the URL.
        'X-goog-api-key: ' .
        GOOGLE_TRANSLATE_API_KEY
    ]
);


curl_setopt(
    $ch,
    CURLOPT_POSTFIELDS,
    json_encode(
        $requestBody,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES
    )
);


curl_setopt(
    $ch,
    CURLOPT_CONNECTTIMEOUT,
    TRANSLATE_CONNECT_TIMEOUT
);


curl_setopt(
    $ch,
    CURLOPT_TIMEOUT,
    TRANSLATE_TOTAL_TIMEOUT
);


// -------------------------------------------------------------------------
// CALL GOOGLE
// -------------------------------------------------------------------------

$response =
    curl_exec(
        $ch
    );


$curlError =
    curl_error(
        $ch
    );


$httpCode =
    curl_getinfo(
        $ch,
        CURLINFO_HTTP_CODE
    );


curl_close(
    $ch
);


// -------------------------------------------------------------------------
// NETWORK ERROR
// -------------------------------------------------------------------------

if (
    $response === false ||
    $curlError !== ''
) {

    http_response_code(502);

    echo json_encode(
        [
            'status'  => 'error',
            'message' =>
                'Could not reach the translation service.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// -------------------------------------------------------------------------
// DECODE GOOGLE RESPONSE
// -------------------------------------------------------------------------

$data =
    json_decode(
        $response,
        true
    );


if (
    !is_array($data)
) {

    http_response_code(502);

    echo json_encode(
        [
            'status'  => 'error',
            'message' =>
                'Translation service returned an invalid response.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// -------------------------------------------------------------------------
// GOOGLE API ERROR
// -------------------------------------------------------------------------

if (
    $httpCode < 200 ||
    $httpCode >= 300
) {

    $googleMessage =
        $data['error']['message']
        ?? 'Translation request failed.';


    http_response_code(502);

    echo json_encode(
        [
            'status'  => 'error',
            'message' => $googleMessage
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// -------------------------------------------------------------------------
// GET FIRST TRANSLATION
// -------------------------------------------------------------------------

$translation =
    $data['data']['translations'][0]
    ?? null;


if (
    !$translation ||
    !isset(
        $translation['translatedText']
    )
) {

    http_response_code(502);

    echo json_encode(
        [
            'status'  => 'error',
            'message' =>
                'Translation result was empty.'
        ],
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// -------------------------------------------------------------------------
// CLEAN TRANSLATED TEXT
//
// Google can encode entities such as:
// &#39;
//
// Convert them back to normal characters.
// -------------------------------------------------------------------------

$translatedText =
    html_entity_decode(
        $translation['translatedText'],
        ENT_QUOTES | ENT_HTML5,
        'UTF-8'
    );


$detectedSource =
    $translation[
        'detectedSourceLanguage'
    ]
    ?? (
        $source !== 'auto'
            ? $source
            : null
    );


// -------------------------------------------------------------------------
// SUCCESS
// -------------------------------------------------------------------------

echo json_encode(
    [
        'status'                   => 'success',

        'original_text'            => $text,

        'translated_text'          =>
            $translatedText,

        'source_language'          =>
            $source,

        'detected_source_language' =>
            $detectedSource,

        'target_language'          =>
            $target,

        'translated'               =>
            true
    ],
    JSON_UNESCAPED_UNICODE |
    JSON_UNESCAPED_SLASHES
);

?>