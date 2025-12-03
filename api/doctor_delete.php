<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

try {
  $auth = require_auth();

  $input = json_decode(file_get_contents('php://input'), true) ?? [];
  $id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);

  if ($id <= 0) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Missing or invalid id']);
    exit;
  }

  // Ensure doctor exists
  $chk = $mysqli->prepare("SELECT id FROM Doctors WHERE id = ? LIMIT 1");
  $chk->bind_param('i', $id);
  $chk->execute();
  $exists = (bool)$chk->get_result()->fetch_assoc();
  $chk->close();
  if (!$exists) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Doctor not found']);
    exit;
  }

  // Block delete if any scheduled / checked-in appointments exist
  $statuses = ['scheduled', 'rescheduled', 'checked in', 'checked-in', 'checkedin'];
  $stmt = $mysqli->prepare("
    SELECT COUNT(*) AS cnt
      FROM Appointments
     WHERE doctorId = ?
       AND LOWER(status) IN (?,?,?,?,?)
  ");
  $stmt->bind_param('isssss', $id, $statuses[0], $statuses[1], $statuses[2], $statuses[3], $statuses[4]);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  $stmt->close();

  if (!empty($row['cnt']) && (int)$row['cnt'] > 0) {
    http_response_code(409);
    echo json_encode(['ok' => false, 'error' => 'Doctor has scheduled or checked-in appointments and cannot be deleted.']);
    exit;
  }

  $del = $mysqli->prepare("DELETE FROM Doctors WHERE id = ? LIMIT 1");
  $del->bind_param('i', $id);
  $del->execute();
  $del->close();

  echo json_encode(['ok' => true]);
} catch (mysqli_sql_exception $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'SQL error', 'detail' => $e->getMessage()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Server error', 'detail' => $e->getMessage()]);
}
