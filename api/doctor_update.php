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
  $pull = function(array $keys) use ($input) {
    foreach ($keys as $k) {
      if (isset($input[$k])) return $input[$k];
    }
    return '';
  };

  $id           = (int)($input['id'] ?? 0);
  $fName        = trim((string)$pull(['fName', 'first_name', 'firstName']));
  $lName        = trim((string)$pull(['lName', 'last_name', 'lastName']));
  $mName        = trim((string)$pull(['mName', 'middle_name', 'middleName']));
  $SyndicateNum = trim((string)$pull(['SyndicateNum', 'syndicateNum', 'syndicate_num', 'syndicate']));
  $phone        = trim((string)$pull(['phone', 'phone_number', 'mobile']));

  $missing = [];
  if ($id <= 0)    $missing[] = 'id';
  if ($fName === '') $missing[] = 'fName';
  if ($lName === '') $missing[] = 'lName';

  if ($missing) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Missing required fields', 'missing' => $missing]);
    exit;
  }

  // Ensure doctor exists
  $check = $mysqli->prepare("SELECT id FROM Doctors WHERE id=? LIMIT 1");
  $check->bind_param('i', $id);
  $check->execute();
  $exists = (bool)$check->get_result()->fetch_assoc();
  $check->close();
  if (!$exists) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Doctor not found']);
    exit;
  }

  $editBy = (int)($auth['sub'] ?? 0);
  $stmt = $mysqli->prepare("
    UPDATE `Doctors`
       SET `fName` = ?, `lName` = ?, `mName` = ?, `SyndicateNum` = ?, `phone` = ?,
           `editBy` = ?, `updatedAt` = NOW()
     WHERE `id` = ?
     LIMIT 1
  ");
  $stmt->bind_param('sssssii', $fName, $lName, $mName, $SyndicateNum, $phone, $editBy, $id);
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
