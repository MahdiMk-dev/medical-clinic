<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

$auth = require_auth();

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$type  = trim($input['type'] ?? '');

if ($type === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields', 'missing' => ['type']]);
    exit;
}

$stmt = $mysqli->prepare("INSERT INTO `Rooms`(`type`,`created_at`) VALUES(?, NOW())");
$stmt->bind_param('s', $type);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['error' => $stmt->error]);
    exit;
}
$id = $stmt->insert_id;
$stmt->close();

echo json_encode(['ok' => true, 'id' => $id]);
