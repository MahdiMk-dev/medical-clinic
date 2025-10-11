<?php
require_once __DIR__ . '/jwt.php';
$config = include __DIR__ . '/../config.php';

function get_bearer_token(){
    // Try getallheaders() case-insensitively
    if (function_exists('getallheaders')) {
        $headers = array_change_key_case(getallheaders(), CASE_LOWER);
        if (isset($headers['authorization'])) {
            if (preg_match('/bearer\s+(\S+)/i', $headers['authorization'], $m)) {
                return $m[1];
            }
        }
    }

    // Common server vars populated by Apache/FastCGI
    $candidates = [
        'HTTP_AUTHORIZATION',
        'REDIRECT_HTTP_AUTHORIZATION',
        'Authorization'
    ];
    foreach ($candidates as $k) {
        if (!empty($_SERVER[$k])) {
            if (preg_match('/bearer\s+(\S+)/i', $_SERVER[$k], $m)) {
                return $m[1];
            }
        }
    }
    return null;
}

/**
 * Call this at the top of any API endpoint that requires auth.
 * Returns the decoded JWT payload on success; otherwise emits a 401 + JSON and exits.
 */
function require_auth() {
    global $config;
    header('Content-Type: application/json');

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

    // Optional: enforce issuer if you want
    // if (!empty($config['jwt_issuer']) && ($payload['iss'] ?? null) !== $config['jwt_issuer']) {
    //     http_response_code(401);
    //     echo json_encode(['error' => 'Invalid token issuer']);
    //     exit;
    // }

    return $payload; // caller can use $payload['sub'], etc.
}
