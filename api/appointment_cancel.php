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
  $id = (int)($input['id'] ?? 0);
  if ($id <= 0) { http_response_code(400); echo json_encode(['error'=>'Missing appointment id']); exit; }

  // confirm exists + status
  $stmt = $mysqli->prepare("SELECT status FROM appointments WHERE id=? LIMIT 1");
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  $stmt->close();

  if (!$row) { http_response_code(404); echo json_encode(['error'=>'Appointment not found']); exit; }
  if (strtolower($row['status']) === 'canceled') { echo json_encode(['ok'=>true]); exit; }

  // mark canceled (no delete)
  $stmt = $mysqli->prepare("UPDATE appointments SET status='canceled', canceled_at = NOW() WHERE id=? LIMIT 1");
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $stmt->close();

  echo json_encode(['ok'=>true]);
} catch (mysqli_sql_exception $e) {
  http_response_code(500);
  echo json_encode(['error'=>'SQL error','detail'=>$e->getMessage()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error'=>'Server error','detail'=>$e->getMessage()]);
}
