<?php
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
header('Content-Type: application/json');

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/jwt.php';

function bearer() {
  $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!$hdr && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    $hdr = $headers['Authorization'] ?? $headers['authorization'] ?? '';
  }
  if (preg_match('/Bearer\s+(.+)/i', $hdr, $m)) return trim($m[1]);
  return null;
}
$tok = bearer();
if (!$tok) { http_response_code(401); echo json_encode(['error'=>'Missing token']); exit; }
try { jwt_decode($tok, $config['jwt_secret']); } catch (Throwable $e) { http_response_code(401); echo json_encode(['error'=>'Invalid token']); exit; }

$q = trim($_GET['q'] ?? '');
if ($q !== '') {
  $stmt = $mysqli->prepare("SELECT id, CONCAT(first_name,' ',last_name) AS name FROM Patients WHERE first_name LIKE CONCAT('%', ?, '%') OR last_name LIKE CONCAT('%', ?, '%') OR phone LIKE CONCAT('%', ?, '%') ORDER BY last_name, first_name LIMIT 50");
  $stmt->bind_param('sss', $q, $q, $q);
} else {
  $stmt = $mysqli->prepare("SELECT id, CONCAT(first_name,' ',last_name) AS name FROM Patients ORDER BY last_name, first_name LIMIT 50");
}
$stmt->execute(); $res = $stmt->get_result();
$out=[]; while($r=$res->fetch_assoc()) $out[]=['id'=>(int)$r['id'],'name'=>$r['name']];
$stmt->close();

echo json_encode(['patients'=>$out]);
