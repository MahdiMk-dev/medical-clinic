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

$first_name = trim($input['first_name'] ?? '');
$last_name  = trim($input['last_name'] ?? '');
$phone      = trim($input['phone'] ?? '');
$email      = trim($input['email'] ?? '');
$address    = trim($input['address'] ?? '');
$dob        = trim($input['dob'] ?? ''); // YYYY-MM-DD or ''

$missing = [];
if ($first_name === '') $missing[] = 'first_name';
if ($last_name === '')  $missing[] = 'last_name';
if ($missing) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields', 'missing' => $missing]);
    exit;
}

$sql = "INSERT INTO `Patients`(`first_name`,`last_name`,`phone`,`email`,`address`,`dob`,`created_at`)
        VALUES(?,?,?,?,?,?, NOW())";
$stmt = $mysqli->prepare($sql);
$dobParam = ($dob !== '') ? $dob : null;
$stmt->bind_param('ssssss', $first_name, $last_name, $phone, $email, $address, $dobParam);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['error' => $stmt->error]);
    exit;
}
$id = $stmt->insert_id;
$stmt->close();

echo json_encode(['ok' => true, 'id' => $id]);
