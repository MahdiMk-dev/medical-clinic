<?php
// CORS (adjust if your frontend is elsewhere)
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
header('Content-Type: application/json');

require_once __DIR__ . '/../src/db.php';   // $mysqli, $config
require_once __DIR__ . '/../src/jwt.php';  // jwt_decode or jwt_verify you already use

// ---- Auth: Bearer token ----
function get_bearer_token(): ?string {
  $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!$hdr && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    $hdr = $headers['Authorization'] ?? $headers['authorization'] ?? '';
  }
  if (preg_match('/Bearer\s+(.+)/i', $hdr, $m)) return trim($m[1]);
  return null;
}

$token = get_bearer_token();
if (!$token) { http_response_code(401); echo json_encode(['error'=>'Missing token']); exit; }

try {
  $claims = jwt_decode($token, $config['jwt_secret']); // or your verify function
  // (optional) check exp/iss here if your jwt lib doesn’t already
} catch (Throwable $e) {
  http_response_code(401);
  echo json_encode(['error'=>'Invalid token']);
  exit;
}

// ---- Inputs ----
$date     = $_GET['date'] ?? date('Y-m-d');
$q        = trim($_GET['q'] ?? '');
$status   = trim($_GET['status'] ?? '');
$sort_by  = $_GET['sort_by'] ?? 'time';
$sort_dir = strtolower($_GET['sort_dir'] ?? 'asc');

$allowedSort = ['time','patient_name','doctor_name','reason','status'];
if (!in_array($sort_by, $allowedSort, true)) $sort_by = 'time';
$sort_dir = $sort_dir === 'desc' ? 'DESC' : 'ASC';

// ---- Query ----
$sql = "SELECT id, DATE_FORMAT(time, '%H:%i') AS time, patient_name, doctor_name, reason, status
        FROM appointments
        WHERE DATE(date) = ?";

$params = [$date];
$types  = "s";

if ($status !== '') {
  $sql .= " AND status = ?";
  $params[] = $status; $types .= "s";
}

if ($q !== '') {
  $sql .= " AND (patient_name LIKE CONCAT('%', ?, '%')
             OR doctor_name LIKE CONCAT('%', ?, '%')
             OR reason LIKE CONCAT('%', ?, '%'))";
  $params[] = $q; $params[] = $q; $params[] = $q; $types .= "sss";
}

$sql .= " ORDER BY $sort_by $sort_dir";

$stmt = $mysqli->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$res = $stmt->get_result();

$rows = [];
while ($r = $res->fetch_assoc()) $rows[] = $r;
$stmt->close();

echo json_encode(['appointments' => $rows]);
