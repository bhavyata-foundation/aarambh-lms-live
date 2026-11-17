<?php
header('Content-Type: application/json');
echo json_encode([
    'zip_extension_loaded' => extension_loaded('zip'),
    'php_ini_actually_used' => php_ini_loaded_file(),
    'php_version' => phpversion()
]);
?>