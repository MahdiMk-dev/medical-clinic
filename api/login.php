<?php
// CORS headers
header("Access-Control-Allow-Origin: *"); // For production, replace * with your frontend domain
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');

require_once __DIR__ . '/../src/db.php';   // gives you $mysqli and $config
require_once __DIR__ . '/../src/jwt.php';

// Read JSON body
$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (!$username || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'username and password required']);
    exit;
}

$stmt = $mysqli->prepare("SELECT id, username, password, role, first_name, last_name FROM users WHERE username = ? LIMIT 1");
$stmt->bind_param('s', $username);
$stmt->execute();
$res = $stmt->get_result();
$user = $res->fetch_assoc();
$stmt->close();

if (!$user || !password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    exit;
}

// Create JWT
$now = time();
$payload = [
    'sub' => $user['id'],
    'username' => $user['username'],
    'role' => $user['role'],
    'iat' => $now,
    'exp' => $now + 60*60*8, // 8 hours
    'iss' => $config['jwt_issuer']
];
$token = jwt_encode($payload, $config['jwt_secret']);

echo json_encode([
    'token' => $token,
    'user' => [
        'id' => $user['id'],
        'username' => $user['username'],
        'first_name' => $user['first_name'],
        'last_name' => $user['last_name'],
        'role' => $user['role']
    ]
]);
