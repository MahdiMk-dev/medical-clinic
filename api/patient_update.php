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
  if ($id <= 0) { http_response_code(400); echo json_encode(['error'=>'Missing id']); exit; }

  // UI sends { id, field, value }
  $field = $input['field'] ?? null;
  if (!is_string($field)) { http_response_code(400); echo json_encode(['error'=>'Missing field']); exit; }

  // Whitelist allowed columns
  $allowed = ['first_name','last_name','phone','email','dob','address'];
  if (!in_array($field, $allowed, true)) {
    http_response_code(400); echo json_encode(['error'=>'Invalid field']); exit;
  }

  // Value (trim strings; allow empty -> NULL using NULLIF below)
  $value = $input['value'] ?? '';
  if (is_string($value)) { $value = trim($value); }

  // Optional validations
  if ($field === 'email' && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400); echo json_encode(['error'=>'Invalid email']); exit;
  }
  if ($field === 'dob' && $value !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
    http_response_code(400); echo json_encode(['error'=>'Invalid date (YYYY-MM-DD)']); exit;
  }

  // Single-column update only; empty string -> NULL safely via NULLIF
  $sql = "UPDATE Patients SET `$field` = NULLIF(?, ''), updated_at = NOW() WHERE id = ? LIMIT 1";
  $stmt = $mysqli->prepare($sql);
  $stmt->bind_param('si', $value, $id);
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
