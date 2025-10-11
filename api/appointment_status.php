<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

try {
  $auth = require_auth();

  $input  = json_decode(file_get_contents('php://input'), true) ?? [];
  $id     = isset($input['id']) ? (int)$input['id'] : 0;
  $target = trim($input['status'] ?? '');

  if ($id <= 0) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Missing or invalid id']);
    exit;
  }
  if ($target === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Missing status']);
    exit;
  }

  // Map UI statuses to DB enum statuses
  // UI: scheduled, checked in, checked out
  // DB: scheduled, completed, no-show, rescheduled, canceled
  $uiToDb = [
    'scheduled'   => 'scheduled',
    'checked in'  => 'rescheduled', // using 'rescheduled' to represent "checked in"
    'checked out' => 'completed',
  ];

  $intent = strtolower($target);
  if (!isset($uiToDb[$intent])) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Unsupported status intent']);
    exit;
  }
  $dbStatus = $uiToDb[$intent];

  // Verify enum allows the mapped DB status
  $res = $mysqli->query("SHOW COLUMNS FROM `Appointments` LIKE 'status'");
  $col = $res ? $res->fetch_assoc() : null;

  $allowedExact = [];
  if ($col && isset($col['Type']) && stripos($col['Type'], 'enum(') === 0) {
    $type   = $col['Type'];                // enum('scheduled','completed',...)
    $inside = substr($type, 5, -1);        // 'scheduled','completed',...
    $parts  = preg_split("/,(?=(?:[^']*'[^']*')*[^']*$)/", $inside);
    foreach ($parts as $p) { $allowedExact[] = trim($p, " '"); }
  }

  // Case-insensitive match to get exact enum casing
  $toStore = $dbStatus;
  if ($allowedExact) {
    $match = null;
    foreach ($allowedExact as $val) {
      if (strtolower($val) === strtolower($dbStatus)) { $match = $val; break; }
    }
    if ($match === null) {
      http_response_code(422);
      echo json_encode(['ok' => false, 'error' => 'Invalid status for this database. Allowed: ' . implode(', ', $allowedExact)]);
      exit;
    }
    $toStore = $match;
  }

  $stmt = $mysqli->prepare("
    UPDATE `Appointments`
       SET `status` = ?, `updatedAt` = NOW()
     WHERE `id` = ?
  ");
  $stmt->bind_param('si', $toStore, $id);
  $stmt->execute();
  $stmt->close();

  echo json_encode(['ok' => true, 'status' => $toStore]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Server error']);
}
