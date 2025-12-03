<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

$auth = require_auth();

try {
  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  $type  = trim((string)($input['type'] ?? $input['name'] ?? ''));
  $id    = isset($input['id']) ? (int)$input['id'] : 0;

  if ($type === '') {
      http_response_code(400);
      echo json_encode(['error' => 'Missing required fields', 'missing' => ['type']]);
      exit;
  }

  if ($id > 0) {
    $stmt = $mysqli->prepare("INSERT INTO `Rooms`(`id`,`type`,`created_at`) VALUES(?, ?, NOW())");
    $stmt->bind_param('is', $id, $type);
  } else {
    $stmt = $mysqli->prepare("INSERT INTO `Rooms`(`type`,`created_at`) VALUES(?, NOW())");
    $stmt->bind_param('s', $type);
  }

  $stmt->execute();
  $newId = $id > 0 ? $id : $stmt->insert_id;
  $stmt->close();

  echo json_encode(['ok' => true, 'id' => $newId]);
} catch (mysqli_sql_exception $e) {
  $code = $e->getCode();
  if ($code === 1062) {
    http_response_code(409);
    echo json_encode(['error' => 'Room ID already exists']);
  } else {
    http_response_code(500);
    echo json_encode(['error' => 'SQL error', 'detail' => $e->getMessage()]);
  }
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => 'Server error', 'detail' => $e->getMessage()]);
}
