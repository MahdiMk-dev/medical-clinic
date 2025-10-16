<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

$auth = require_auth();

$list = isset($_GET['list']);
$q    = trim($_GET['q'] ?? '');

// ...header/auth stays the same...

if ($list) {
  // Searchable list mode for dropdowns (supports ID or text)
  if ($q !== '') {
    $isNum = ctype_digit($q);
    if ($isNum) {
      $stmt = $mysqli->prepare("
        SELECT id, CONCAT(first_name, ' ', last_name) AS name, phone
        FROM Patients
        WHERE id = ?
        ORDER BY last_name, first_name
        LIMIT 50
      ");
      $qid = (int)$q;
      $stmt->bind_param('i', $qid);
    } else {
      $like = "%$q%";
      $stmt = $mysqli->prepare("
        SELECT id, CONCAT(first_name, ' ', last_name) AS name, phone
        FROM Patients
        WHERE first_name LIKE ? OR last_name LIKE ?
           OR CONCAT(first_name, ' ', last_name) LIKE ?
           OR phone LIKE ? OR email LIKE ?
        ORDER BY last_name, first_name
        LIMIT 50
      ");
      $stmt->bind_param('sssss', $like, $like, $like, $like, $like);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $out = [];
    while ($row = $res->fetch_assoc()) $out[] = $row;
    $stmt->close();
    echo json_encode(['patients' => $out]);
    exit;
  } else {
    $sql = "SELECT id, CONCAT(first_name, ' ', last_name) AS name, phone
            FROM Patients
            ORDER BY last_name, first_name
            LIMIT 50";
    $res = $mysqli->query($sql);
    $out = [];
    while ($row = $res->fetch_assoc()) $out[] = $row;
    echo json_encode(['patients' => $out]);
    exit;
  }
}


/* Full listing (unchanged) */
$qfull = $q;
if ($qfull !== '') {
  $like = "%$qfull%";
  $stmt = $mysqli->prepare("
    SELECT id, first_name, last_name, phone, email, address, dob,
           DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM Patients
    WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?
    ORDER BY last_name, first_name
    LIMIT 500
  ");
  $stmt->bind_param('ssss', $like, $like, $like, $like);
  $stmt->execute();
  $res = $stmt->get_result();
  $rows = $res->fetch_all(MYSQLI_ASSOC);
  $stmt->close();
  echo json_encode(['patients' => $rows]);
  exit;
} else {
  $sql = "SELECT id, first_name, last_name, phone, email, address, dob,
                 DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
          FROM Patients
          ORDER BY last_name, first_name
          LIMIT 500";
  $res = $mysqli->query($sql);
  $rows = [];
  while ($row = $res->fetch_assoc()) $rows[] = $row;
  echo json_encode(['patients' => $rows]);
  exit;
}
