<?php
// simple JWT implementation (HMAC-SHA256). Keep secret in config.php
function base64url_encode($data){
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function base64url_decode($data){
    $remainder = strlen($data) % 4;
    if ($remainder) $data .= str_repeat('=', 4 - $remainder);
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_encode($payload, $secret, $alg='HS256'){
    $header = ['typ'=>'JWT','alg'=>$alg];
    $segments = [];
    $segments[] = base64url_encode(json_encode($header));
    $segments[] = base64url_encode(json_encode($payload));
    $signing_input = implode('.', $segments);
    $signature = hash_hmac('sha256', $signing_input, $secret, true);
    $segments[] = base64url_encode($signature);
    return implode('.', $segments);
}

function jwt_decode($jwt, $secret){
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return false;
    list($b64h, $b64p, $b64s) = $parts;
    $signing_input = $b64h . '.' . $b64p;
    $signature = base64url_decode($b64s);
    $expected = hash_hmac('sha256', $signing_input, $secret, true);
    if (!hash_equals($expected, $signature)) return false;
    $payload = json_decode(base64url_decode($b64p), true);
    if (!$payload) return false;
    // check exp if present
    if (isset($payload['exp']) && time() > $payload['exp']) return false;
    return $payload;
}
