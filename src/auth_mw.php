<?php
require_once __DIR__ . '/jwt.php';
$config = include __DIR__ . '/../config.php';

function get_bearer_token(){
    $headers = getallheaders();
    if (isset($headers['Authorization'])) {
        $matches = [];
        if (preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) return $matches[1];
    }
    // some servers put it under HTTP_AUTHORIZATION
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        if (preg_match('/Bearer\s(\S+)/', $_SERVER['HTTP_AUTHORIZATION'], $matches)) return $matches[1];
    }
    return null;
}

function require_auth(){
    global $config;
    $token = get_bearer_token();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Missing token']);
        exit;
    }
    $payload = jwt_decode($token, $config['jwt_secret']);
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid or expired token']);
        exit;
    }
    return $payload; // caller can use $payload['sub'], etc.
}
