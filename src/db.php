<?php
$config = include __DIR__ . '/../config.php';
$mysqli = new mysqli($config['localhost'], $config['root'], $config[''], $config['db_name']);
if ($mysqli->connect_errno) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connect error: ' . $mysqli->connect_error]);
    exit;
}
$mysqli->set_charset('utf8mb4');
