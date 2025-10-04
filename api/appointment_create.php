<?php
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
header('Content-Type: application/json');

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/jwt.php';

// ---- Auth ----
function get_bearer_token(): ?string {
  $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['Authorization'] ?? getenv('HTTP_AUTHORIZATION') ?? '';
  if (!$hdr && function_exists('getallheaders')) {
    $headers = getallheaders();
    $hdr = $headers['Authorization'] ?? $headers['authorization'] ?? '';
  }
  if (preg_match('/Bearer\s+(.+)/i', $hdr, $m)) return trim($m[1]);
  return null;
}
$tok = get_bearer_token();
if (!$tok) { http_response_code(401); echo json_encode(['error'=>'Missing token']); exit; }
try { $claims = jwt_decode($tok, $config['jwt_secret']); }
catch (Throwable $e) { http_response_code(401); echo json_encode(['error'=>'Invalid token']); exit; }
$userId = (int)($claims['sub'] ?? 0);

// ---- Input ----
$raw   = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) { http_response_code(400); echo json_encode(['error'=>'Body must be JSON']); exit; }

$patientId = $input['patientId']  ?? null;
$doctorId  = $input['doctorId']   ?? null;
$roomId    = $input['roomId']     ?? null;
$date      = $input['date']       ?? null; // YYYY-MM-DD
$from_time = $input['from_time']  ?? null; // HH:MM
$to_time   = $input['to_time']    ?? null; // HH:MM

$summary   = trim((string)($input['summary']   ?? ''));
$chargesId = $input['chargesId']  ?? null; // optional int or null
$comment   = trim((string)($input['comment']   ?? ''));
$type      = $input['type']       ?? null;
$status    = $input['status']     ?? 'Scheduled';
$clearance = $input['clearance']  ?? null;

// Minimal required fields check
$missing = [];
foreach (['patientId','doctorId','roomId','date','from_time','to_time'] as $k) {
  if (!isset($input[$k]) || $input[$k] === '' || $input[$k] === null) $missing[] = $k;
}
if ($missing) { http_response_code(400); echo json_encode(['error'=>'Missing required fields','missing'=>$missing]); exit; }

// Casts / formats
$patientId = (int)$patientId;
$doctorId  = (int)$doctorId;
$roomId    = (int)$roomId;
$chargesId = ($chargesId === '' || $chargesId === null) ? null : (int)$chargesId;

// ---- INSERT (fixed column names: editBy, not editedBy) ----
$sql = "
  INSERT INTO `Appointments`
    (`patientID`, `doctorId`, `roomID`,
     `from_time`, `to_time`, `date`,
     `summary`, `chargesID`, `comment`,
     `type`, `status`, `clearance`,
     `createdBy`, `editBy`, `createdAt`, `updatedAt`)
  VALUES
    (?, ?, ?,
     ?, ?, ?,
     ?, ?, ?,
     ?, ?, ?,
     ?, ?, NOW(), NOW())
";

$stmt = $mysqli->prepare($sql);
if (!$stmt) { http_response_code(500); echo json_encode(['error'=>$mysqli->error]); exit; }

/*
bind types:
 patientID(i) doctorId(i) roomID(i)
 from_time(s) to_time(s) date(s)
 summary(s) chargesID(i or null => s with null? No: use 'i' and pass null is okay)
 comment(s) type(s) status(s) clearance(s)
 createdBy(i) editBy(i)

We’ll bind chargesID as 'i' and pass null via $chargesId = null (mysqli is fine with nulls).
Types: i i i s s s s i s s s s i i  => "iiissssissssii"
*/
$editBy = $userId;

$stmt->bind_param(
  'iiissssissssii',
  $patientId, $doctorId, $roomId,
  $from_time, $to_time, $date,
  $summary, $chargesId, $comment,
  $type, $status, $clearance,
  $userId, $editBy
);

$ok = $stmt->execute();
if (!$ok) {
  http_response_code(500);
  echo json_encode(['error'=>$stmt->error]);
  $stmt->close();
  exit;
}

$newId = $stmt->insert_id;
$stmt->close();

echo json_encode(['ok'=>true,'id'=>$newId]);
