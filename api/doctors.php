<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

try {
  $auth = require_auth();

  $list = isset($_GET['list']);
  $q    = trim($_GET['q'] ?? '');

  $selectFull = "
    id, fName, lName, mName, SyndicateNum, phone, createdBy, editBy,
    DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') AS created_at,
    DATE_FORMAT(updatedAt, '%Y-%m-%d %H:%i:%s') AS updated_at
  ";

  if ($list) {
    // Lightweight list for dropdowns/search pickers
    if ($q !== '') {
      $isNum = ctype_digit($q);
      if ($isNum) {
        $stmt = $mysqli->prepare("
          SELECT id, CONCAT('Dr. ', fName, ' ', lName) AS name, phone
          FROM Doctors
          WHERE id = ?
          ORDER BY lName, fName
          LIMIT 50
        ");
        $qid = (int)$q;
        $stmt->bind_param('i', $qid);
      } else {
        $like = "%$q%";
        $stmt = $mysqli->prepare("
          SELECT id, CONCAT('Dr. ', fName, ' ', lName) AS name, phone
          FROM Doctors
          WHERE fName LIKE ? OR lName LIKE ? OR mName LIKE ?
             OR CONCAT(fName, ' ', lName) LIKE ?
             OR SyndicateNum LIKE ? OR phone LIKE ?
          ORDER BY lName, fName
          LIMIT 50
        ");
        $stmt->bind_param('ssssss', $like, $like, $like, $like, $like, $like);
      }
      $stmt->execute();
      $res = $stmt->get_result();
      $rows = [];
      while ($r = $res->fetch_assoc()) $rows[] = $r;
      $stmt->close();
      echo json_encode(['doctors' => $rows]);
      exit;
    } else {
      $sql = "SELECT id, CONCAT('Dr. ', fName, ' ', lName) AS name, phone
              FROM Doctors
              ORDER BY lName, fName
              LIMIT 50";
      $res = $mysqli->query($sql);
      $rows = [];
      while ($r = $res->fetch_assoc()) $rows[] = $r;
      echo json_encode(['doctors' => $rows]);
      exit;
    }
  }

  // Full listing/search (admin view)
  if ($q !== '') {
    $like = "%$q%";
    $stmt = $mysqli->prepare("
      SELECT $selectFull
      FROM Doctors
      WHERE fName LIKE ? OR lName LIKE ? OR mName LIKE ?
         OR SyndicateNum LIKE ? OR phone LIKE ?
      ORDER BY lName, fName
      LIMIT 500
    ");
    $stmt->bind_param('sssss', $like, $like, $like, $like, $like);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = $res->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    echo json_encode(['doctors' => $rows]);
    exit;
  } else {
    $sql = "SELECT $selectFull
            FROM Doctors
            ORDER BY lName, fName
            LIMIT 500";
    $res = $mysqli->query($sql);
    $rows = [];
    while ($r = $res->fetch_assoc()) $rows[] = $r;
    echo json_encode(['doctors' => $rows]);
    exit;
  }
} catch (mysqli_sql_exception $e) {
  http_response_code(500);
  echo json_encode(['error' => 'SQL error', 'detail' => $e->getMessage()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => 'Server error', 'detail' => $e->getMessage()]);
}
