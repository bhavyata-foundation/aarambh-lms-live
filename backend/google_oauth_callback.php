<?php
// Google sends teachers back to THIS address after "Connect Google Drive"
// (it is the redirect address registered with Google). The real file is
// in backend/drive/ — this only hands over to it. Don't delete this file.
require __DIR__ . '/drive/google_oauth_callback.php';
