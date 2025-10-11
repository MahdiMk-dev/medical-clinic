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

if ($list) {
  if ($q !== '') {
    $isNum = ctype_digit($q);
    if ($isNum) {
      $stmt = $mysqli->prepare("
        SELECT id, CONCAT('Room ', id, ' — ', COALESCE(type, 'General')) AS name
        FROM Rooms
        WHERE id = ?
        ORDER BY id
        LIMIT 50
      ");
      $qid = (int)$q;
      $stmt->bind_param('i', $qid);
    } else {
      $like = "%$q%";
      $stmt = $mysqli->prepare("
        SELECT id, CONCAT('Room ', id, ' — ', COALESCE(type, 'General')) AS name
        FROM Rooms
        WHERE type LIKE ?
        ORDER BY id
        LIMIT 50
      ");
      $stmt->bind_param('s', $like);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($r = $res->fetch_assoc()) $rows[] = $r;
    $stmt->close();
    echo json_encode(['rooms' => $rows]);
    exit;
  } else {
    $sql = "SELECT id, CONCAT('Room ', id, ' — ', COALESCE(type, 'General')) AS name
            FROM Rooms
            ORDER BY id
            LIMIT 50";
    $res = $mysqli->query($sql);
    $rows = [];
    while ($r = $res->fetch_assoc()) $rows[] = $r;
    echo json_encode(['rooms' => $rows]);
    exit;
  }
}

/* Full listing (if you ever need it) */
if ($q !== '') {
  $like = "%$q%";
  $stmt = $mysqli->prepare("
    SELECT id, type, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM Rooms
    WHERE type LIKE ?
    ORDER BY id
    LIMIT 500
  ");
  $stmt->bind_param('s', $like);
  $stmt->execute();
  $res = $stmt->get_result();
  $rows = $res->fetch_all(MYSQLI_ASSOC);
  $stmt->close();
  echo json_encode(['rooms' => $rows]);
  exit;
} else {
  $sql = "SELECT id, type, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
          FROM Rooms
          ORDER BY id
          LIMIT 500";
  $res = $mysqli->query($sql);
  $rows = [];
  while ($r = $res->fetch_assoc()) $rows[] = $r;
  echo json_encode(['rooms' => $rows]);
  exit;
}
