<?php
// =========================================================================
// ENV STATUS — tells the page banner whether this browser is in test mode.
// File: backend/dev/env_status.php   Returns { env: "test" | "live" }
// =========================================================================
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/test_env_switch.php';
$test = aarambh_is_test_request();
echo json_encode(['status' => 'success', 'env' => $test ? 'test' : 'live']);
