<?php
// =========================================================================
// TEST MODE SWITCH — decides which database this request uses.
// File: backend/dev/test_env_switch.php  (loaded by backend/users/db_config.php)
//
// Normal requests use the real database. A browser that has been put in
// test mode (from backend/dev/test_env.php, or the join link it gives)
// carries a cookie holding the current test key; only then does it use
// "<real name>_test". A made-up or old cookie does nothing — the key must
// match backend/dev/test_mode_key.txt exactly. Changing the key on the
// test page takes every device out of test mode at once.
// =========================================================================

const AARAMBH_TEST_COOKIE = 'aarambh_test_mode';

function aarambh_test_key(){
    $f = __DIR__ . '/test_mode_key.txt';
    return is_file($f) ? trim((string) file_get_contents($f)) : '';
}

function aarambh_is_test_request(){
    $key = aarambh_test_key();
    $cookie = (string) ($_COOKIE[AARAMBH_TEST_COOKIE] ?? '');
    return $key !== '' && $cookie !== '' && hash_equals($key, $cookie);
}

function aarambh_active_db_name($liveName){
    return aarambh_is_test_request() ? $liveName . '_test' : $liveName;
}
