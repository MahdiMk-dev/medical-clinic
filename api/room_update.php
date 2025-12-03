<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

try {
  $auth = require_auth();

  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  $id    = isset($input['id']) ? (int)$input['id'] : 0;
  $type  = trim((string)($input['type'] ?? $input['name'] ?? ''));

  $missing = [];
  if ($id <= 0)   $missing[] = 'id';
  if ($type === '') $missing[] = 'type';
  if ($missing) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Missing required fields', 'missing' => $missing]);
    exit;
  }

  // Ensure room exists
  $chk = $mysqli->prepare("SELECT id FROM Rooms WHERE id = ? LIMIT 1");
  $chk->bind_param('i', $id);
  $chk->execute();
  $exists = (bool)$chk->get_result()->fetch_assoc();
  $chk->close();
  if (!$exists) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Room not found']);
    exit;
  }

  $stmt = $mysqli->prepare("UPDATE `Rooms` SET `type` = ? WHERE `id` = ? LIMIT 1");
  $stmt->bind_param('si', $type, $id);
  $stmt->execute();
  $stmt->close();

  echo json_encode(['ok' => true]);
} catch (mysqli_sql_exception $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'SQL error', 'detail' => $e->getMessage()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Server error', 'detail' => $e->getMessage()]);
}
