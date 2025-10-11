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

  $createdBy = (int)($auth['sub'] ?? 0);

  // ✅ Use createdBy for both createdBy and editBy
  $sql = "INSERT INTO `Doctors`
          (`fName`, `lName`, `mName`, `SyndicateNum`, `phone`, `createdBy`, `editBy`, `createdAt`, `updatedAt`)
          VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";

  $stmt = $mysqli->prepare($sql);
  $stmt->bind_param('sssssii', $fName, $lName, $mName, $SyndicateNum, $phone, $createdBy, $createdBy);
  $stmt->execute();

  echo json_encode(['ok' => true, 'id' => $stmt->insert_id]);
  $stmt->close();

} catch (mysqli_sql_exception $e) {
  http_response_code(500);
  echo json_encode(['error' => 'SQL error', 'detail' => $e->getMessage()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => 'Server error', 'detail' => $e->getMessage()]);
}
