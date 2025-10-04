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

$fName        = trim($input['fName'] ?? '');
$lName        = trim($input['lName'] ?? '');
$mName        = trim($input['mName'] ?? '');
$SyndicateNum = trim($input['SyndicateNum'] ?? '');
$phone        = trim($input['phone'] ?? '');

$missing = [];
if ($fName === '') $missing[] = 'fName';
if ($lName === '') $missing[] = 'lName';
if ($missing) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields', 'missing' => $missing]);
    exit;
}

$sql = "INSERT INTO `Doctors`(`fName`,`lName`,`mName`,`SyndicateNum`,`phone`,`createdBy`,`editedBy`,`createdAt`,`updatedAt`)
        VALUES(?,?,?,?,?,?,NULL, NOW(), NOW())";
$stmt = $mysqli->prepare($sql);
$createdBy = intval($auth['sub']);
$stmt->bind_param('sssssi', $fName, $lName, $mName, $SyndicateNum, $phone, $createdBy);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode(['error' => $stmt->error]);
    exit;
}
$id = $stmt->insert_id;
$stmt->close();

echo json_encode(['ok' => true, 'id' => $id]);
