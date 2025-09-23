<?php
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
header('Content-Type: application/json');

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/jwt.php';

// Auth
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
try { $claims = jwt_decode($tok, $config['jwt_secret']); } catch (Throwable $e) { http_response_code(401); echo json_encode(['error'=>'Invalid token']); exit; }

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$patientId = (int)($input['patientId'] ?? 0);
$doctorId  = (int)($input['doctorId']  ?? 0);
$roomId    = (int)($input['roomId']    ?? 0);
$date      = $input['date'] ?? '';
$from_time = $input['from_time'] ?? '';
$to_time   = $input['to_time'] ?? '';
$type      = $input['type'] ?? null;
$summary   = trim($input['summary'] ?? '');
$comment   = trim($input['comment'] ?? '');
$status    = 'Scheduled';

if (!$patientId || !$doctorId || !$roomId || !$date || !$from_time || !$to_time) {
  http_response_code(400);
  echo json_encode(['error'=>'Missing required fields']);
  exit;
}

$stmt = $mysqli->prepare("INSERT INTO Appointments
  (patientId, doctorId, roomId, from_time, to_time, date, summary, comment, type, status, clearance, createdBy, editedBy, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NOW(), NOW())");
$creator = (int)($claims['sub'] ?? 0);
$stmt->bind_param('iiisssssssii',
  $patientId, $doctorId, $roomId, $from_time, $to_time, $date,
  $summary, $comment, $type, $status, $creator, $creator
);
$stmt->execute();
$newId = $stmt->insert_id;
$stmt->close();

echo json_encode(['ok'=>true, 'id'=>$newId]);
