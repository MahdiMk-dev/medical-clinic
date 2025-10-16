<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

try {
  $auth = require_auth();

  $q = trim((string)($_GET['q'] ?? ''));
  $limit = 50;

  // Tokenize query into terms; match on first_name, last_name, phone, id
  $terms = array_values(array_filter(preg_split('/\s+/', $q), fn($t) => $t !== ''));
  $wheres = [];
  $params = [];
  $types  = '';

  if ($q === '' || $q === '*') {
    // return most recent patients if no query
    $sql = "SELECT id, first_name, last_name, phone
              FROM Patients
             ORDER BY id DESC
             LIMIT ?";
    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param('i', $limit);
  } else {
    // Build (fn LIKE ? OR ln LIKE ? OR phone LIKE ? OR id = ?) per term
    foreach ($terms as $t) {
      $like = "%$t%";
      $wheres[] = "(first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR CAST(id AS CHAR) = ?)";
      $params[] = $like; $params[] = $like; $params[] = $like; $params[] = $t;
      $types   .= 'ssss';
    }
    $whereSql = implode(' AND ', $wheres);
    $sql = "SELECT id, first_name, last_name, phone
              FROM Patients
             WHERE $whereSql
             ORDER BY last_name ASC, first_name ASC
             LIMIT ?";
    $stmt = $mysqli->prepare($sql);
    $types .= 'i';
    $params[] = $limit;
    $stmt->bind_param($types, ...$params);
  }

  $stmt->execute();
  $res = $stmt->get_result();
  $rows = [];
  while ($r = $res->fetch_assoc()) $rows[] = $r;
  $stmt->close();

  echo json_encode(['results' => $rows], JSON_UNESCAPED_UNICODE);

} catch (mysqli_sql_exception $e) {
  http_response_code(500);
  echo json_encode(['error'=>'SQL error','detail'=>$e->getMessage()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error'=>'Server error','detail'=>$e->getMessage()]);
}
