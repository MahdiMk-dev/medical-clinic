<?php
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/jwt.php';

// --- Auth ---
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
if (!$tok) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Missing token']); exit; }
try { $claims = jwt_decode($tok, $config['jwt_secret']); }
catch (Throwable $e) { http_response_code(401); echo json_encode(['ok'=>false,'error'=>'Invalid token']); exit; }

// --- Input ---
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = (int)($input['id'] ?? 0);
if ($id <= 0) { http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Missing id']); exit; }

// Load current row
$stmt = $mysqli->prepare("SELECT id, doctorId, roomID, patientID, `date`, from_time, to_time, status FROM Appointments WHERE id=? LIMIT 1");
$stmt->bind_param('i', $id);
$stmt->execute();
$cur = $stmt->get_result()->fetch_assoc();
$stmt->close();
if (!$cur) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Appointment not found']); exit; }

// Helpers
$normalizeTime = function($t) {
  if ($t === null || $t === '') return null;
  if (preg_match('/^\d{2}:\d{2}$/', $t)) return $t . ':00';
  if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $t)) return $t;
  return null; // invalid -> caught by validator
};

// Accept camelCase/snake_case AND from/to aliases
$doctorId  = isset($input['doctorId'])  ? (int)$input['doctorId']  : (int)($input['doctor_id']  ?? 0);
$roomId    = isset($input['roomId'])    ? (int)$input['roomId']    : (int)($input['room_id']    ?? 0);
$patientId = isset($input['patientId']) ? (int)$input['patientId'] : (int)($input['patient_id'] ?? 0);

$date      = (string)($input['date'] ?? '');
$fromRaw   = $input['from_time'] ?? $input['from'] ?? null;
$toRaw     = $input['to_time']   ?? $input['to']   ?? null;

$from_time = array_key_exists('from_time',$input) || array_key_exists('from',$input)
  ? $normalizeTime((string)$fromRaw) : null;
$to_time   = array_key_exists('to_time',$input) || array_key_exists('to',$input)
  ? $normalizeTime((string)$toRaw)   : null;

$summary   = array_key_exists('summary',$input) ? (trim((string)$input['summary']) ?: null) : null;
$comment   = array_key_exists('comment',$input) ? (trim((string)$input['comment']) ?: null) : null;

// Merge with current values
$cand = [
  'doctorId'  => $doctorId  ?: (int)$cur['doctorId'],
  'roomId'    => $roomId    ?: (int)$cur['roomID'],
  'patientId' => $patientId ?: (int)$cur['patientID'],
  'date'      => $date      !== '' ? $date : (string)$cur['date'],
  'from_time' => $from_time !== null ? $from_time : (string)$cur['from_time'],
  'to_time'   => $to_time   !== null ? $to_time   : (string)$cur['to_time'],
  'summary'   => $summary,
  'comment'   => $comment,
];

// Validate
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $cand['date'])) {
  http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Invalid date format (YYYY-MM-DD)']); exit;
}
if (!preg_match('/^\d{2}:\d{2}:\d{2}$/', $cand['from_time'])) {
  http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Invalid from_time (HH:MM or HH:MM:SS)']); exit;
}
if (!preg_match('/^\d{2}:\d{2}:\d{2}$/', $cand['to_time'])) {
  http_response_code(400); echo json_encode(['ok'=>false,'error'=>'Invalid to_time (HH:MM or HH:MM:SS)']); exit;
}
if (strcmp($cand['from_time'], $cand['to_time']) >= 0) {
  http_response_code(400); echo json_encode(['ok'=>false,'error'=>'from_time must be earlier than to_time']); exit;
}

// Overlap check (doctor OR room OR patient), exclude current row; back-to-back is OK
$conflict = function($col, $val) use ($mysqli, $cand, $id) {
  $sql = "
    SELECT id FROM Appointments
    WHERE `$col` = ?
      AND `date` = ?
      AND LOWER(status) <> 'canceled'
      AND id <> ?
      AND NOT ( ? <= from_time OR ? >= to_time )
    LIMIT 1
  ";
  $stmt = $mysqli->prepare($sql);
  $stmt->bind_param('isiss', $val, $cand['date'], $id, $cand['to_time'], $cand['from_time']);
  $stmt->execute();
  $hit = (bool)$stmt->get_result()->fetch_assoc();
  $stmt->close();
  return $hit;
};

if ($conflict('doctorId',  (int)$cand['doctorId']))  { http_response_code(409); echo json_encode(['ok'=>false,'error'=>'Time conflict: doctor already booked for this slot.']);  exit; }
if ($conflict('roomID',    (int)$cand['roomId']))    { http_response_code(409); echo json_encode(['ok'=>false,'error'=>'Time conflict: room already booked for this slot.']);    exit; }
if ($conflict('patientID', (int)$cand['patientId'])) { http_response_code(409); echo json_encode(['ok'=>false,'error'=>'Time conflict: patient already booked for this slot.']); exit; }

// Update
$stmt = $mysqli->prepare("
  UPDATE Appointments
     SET doctorId  = ?,
         roomID    = ?,
         patientID = ?,
         `date`    = ?,
         from_time = ?,
         to_time   = ?,
         summary   = COALESCE(?, summary),
         comment   = COALESCE(?, comment),
         updatedAt = NOW()
   WHERE id = ?
");
$stmt->bind_param(
  'iiisssssi',
  $cand['doctorId'],
  $cand['roomId'],
  $cand['patientId'],
  $cand['date'],
  $cand['from_time'],
  $cand['to_time'],
  $cand['summary'],
  $cand['comment'],
  $id
);
$stmt->execute();
$aff = $stmt->affected_rows;
$stmt->close();

echo json_encode(['ok'=>true, 'updated'=>$aff]);
