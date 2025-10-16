<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

function col_exists(mysqli $db, string $table, string $col): bool {
  $sql = "SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME   = ?
             AND COLUMN_NAME  = ?
           LIMIT 1";
  $stmt = $db->prepare($sql);
  $stmt->bind_param('ss', $table, $col);
  $stmt->execute();
  $ok = (bool)$stmt->get_result()->fetch_row();
  $stmt->close();
  return $ok;
}

try {
  $auth = require_auth();

  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  $id     = (int)($input['id'] ?? 0);
  $status = trim((string)($input['status'] ?? ''));

  if (!$id) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Missing id']); exit; }

  $allowed = ['pending','notified','scheduled','canceled'];
  if (!in_array($status, $allowed, true)) {
    http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Invalid status']); exit;
  }

  // Optional fields (only used if columns exist)
  $doctor_id      = isset($input['doctor_id']) ? (int)$input['doctor_id'] : null;
  $appointment_id = isset($input['appointment_id']) ? (int)$input['appointment_id'] : null;

  $hasDoctorCol = col_exists($mysqli, 'waitlist', 'doctor_id');
  $hasApptCol   = col_exists($mysqli, 'waitlist', 'appointment_id');

  // Build dynamic UPDATE
  $sets = ['status = ?'];
  $types = 's';
  $vals  = [$status];

  if ($hasDoctorCol && $doctor_id !== null) {
    $sets[] = 'doctor_id = ?';
    $types .= 'i';
    $vals[] = $doctor_id;
  }
  if ($hasApptCol && $appointment_id !== null) {
    $sets[] = 'appointment_id = ?';
    $types .= 'i';
    $vals[] = $appointment_id;
  }

  // Always where by id
  $types .= 'i';
  $vals[] = $id;

  $sql = "UPDATE waitlist SET ".implode(', ', $sets)." WHERE id = ?";
  $stmt = $mysqli->prepare($sql);
  $stmt->bind_param($types, ...$vals);
  $stmt->execute();
  $aff = $stmt->affected_rows;
  $stmt->close();

  echo json_encode(['ok'=>true, 'updated'=>$aff]);

} catch (mysqli_sql_exception $e) {
  http_response_code(500);
  echo json_encode(['error'=>'SQL error','detail'=>$e->getMessage()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error'=>'Server error','detail'=>$e->getMessage()]);
}
