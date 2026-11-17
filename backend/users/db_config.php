<?php

// ============================================================
// DATABASE CONFIGURATION
// The password is NOT in this file. It lives in backend/config.php,
// which exists only on the server and is never committed to Git.
// ============================================================

$cfg_file = __DIR__ . '/../config.php';
if (!is_file($cfg_file)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['status' => 'error', 'message' => 'Server configuration missing.']);
    exit;
}
require_once $cfg_file;   // defines $db_host, $db_name, $db_user, $db_pass, $db_port

$db_live_name = $db_name;
if (is_file(__DIR__ . '/../dev/test_env_switch.php')) {
    require_once __DIR__ . '/../dev/test_env_switch.php';
    $db_name = aarambh_active_db_name($db_name);
}

function get_db_connection()
{
    global $db_host, $db_name, $db_user, $db_pass, $db_port;

    $conn = new mysqli(
        $db_host,
        $db_user,
        $db_pass,
        $db_name,
        $db_port
    );

    if ($conn->connect_error) {

        http_response_code(500);

        header('Content-Type: application/json; charset=utf-8');

        echo json_encode([
            'status' => 'error',
            'message' => 'Database connection failed.'
        ]);

        exit;
    }

    $conn->set_charset('utf8mb4');
    $conn->query("SET time_zone = '+05:30'");

    return $conn;
}
