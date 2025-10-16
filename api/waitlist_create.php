<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

// Utility: check if a column exists (so we can set doctor_id only if present)
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

  $patient_id = isset($input['patientId']) ? (int)$input['patientId'] : (int)($input['patient_id'] ?? 0);
  $doctor_id  = isset($input['doctorId'])  ? (int)$input['doctorId']  : (isset($input['doctor_id']) ? (int)$input['doctor_id'] : null);
  $notes      = trim((string)($input['notes'] ?? ''));

  if (!$patient_id) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'patient_id is required']);
    exit;
  }

  $hasDoctor = col_exists($mysqli, 'waitlist', 'doctor_id');

  // Insert waitlist row
  if ($hasDoctor) {
    $sql = "INSERT INTO waitlist (patient_id, doctor_id, notes, status, created_at)
            VALUES (?, ?, ?, 'pending', NOW())";
    $stmt = $mysqli->prepare($sql);
    // If doctor_id is null, bind as NULL properly
    if ($doctor_id === null) {
      $null = null;
      $stmt->bind_param('iss', $patient_id, $null, $notes);
    } else {
      $stmt->bind_param('iis', $patient_id, $doctor_id, $notes);
    }
  } else {
    $sql = "INSERT INTO waitlist (patient_id, notes, status, created_at)
            VALUES (?, ?, 'pending', NOW())";
    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param('is', $patient_id, $notes);
  }

  $stmt->execute();
  $newId = $stmt->insert_id;
  $stmt->close();

  // Return created row summary
  $q = $mysqli->prepare("
    SELECT
      w.id, w.patient_id, w.status,
      DATE_FORMAT(w.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM waitlist w
    WHERE w.id = ?
  ");
  $q->bind_param('i', $newId);
  $q->execute();
  $res = $q->get_result();
  $row = $res->fetch_assoc() ?: ['id'=>$newId, 'patient_id'=>$patient_id, 'status'=>'pending', 'created_at'=>date('Y-m-d H:i:s')];
  $q->close();

  echo json_encode(['ok' => true, 'id' => (int)$row['id'], 'created_at' => $row['created_at']]);

} catch (mysqli_sql_exception $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false, 'error'=>'SQL error', 'detail'=>$e->getMessage()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false, 'error'=>'Server error', 'detail'=>$e->getMessage()]);
}
