<?php
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
header('Content-Type: application/json');

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
if (!$tok) { http_response_code(401); echo json_encode(['error'=>'Missing token']); exit; }
try { $claims = jwt_decode($tok, $config['jwt_secret']); }
catch (Throwable $e) { http_response_code(401); echo json_encode(['error'=>'Invalid token']); exit; }

// --- Input ---
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = (int)($input['id'] ?? 0);
if (!$id) { http_response_code(400); echo json_encode(['error'=>'Missing id']); exit; }

// 1) Load current row to compute final candidate values
$stmt = $mysqli->prepare("SELECT id, doctorId, roomId, `date`, from_time, to_time, status FROM Appointments WHERE id=? LIMIT 1");
$stmt->bind_param('i', $id);
$stmt->execute();
$cur = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$cur) { http_response_code(404); echo json_encode(['error'=>'Appointment not found']); exit; }

// 2) Merge inputs (normalize times)
$normalizeTime = function($t) {
  if ($t === null || $t === '') return null;
  if (preg_match('/^\d{2}:\d{2}$/', $t)) return $t . ':00';
  if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $t)) return $t;
  return null;
};
$cand = [
  'doctorId'  => isset($input['doctorId'])  && $input['doctorId']  ? (int)$input['doctorId']  : (int)$cur['doctorId'],
  'roomId'    => isset($input['roomId'])    && $input['roomId']    ? (int)$input['roomId']    : (int)$cur['roomId'],
  'date'      => isset($input['date'])      && $input['date']      !== '' ? (string)$input['date']      : (string)$cur['date'],
  'from_time' => array_key_exists('from_time',$input) ? $normalizeTime($input['from_time']) : (string)$cur['from_time'],
  'to_time'   => array_key_exists('to_time',  $input) ? $normalizeTime($input['to_time'])   : (string)$cur['to_time'],
  // summary/comment can remain partial/optional
  'summary'   => array_key_exists('summary',$input) ? (trim((string)$input['summary']) ?: null) : null,
  'comment'   => array_key_exists('comment',$input) ? (trim((string)$input['comment']) ?: null) : null,
];

// 3) Validate formats
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $cand['date'])) {
  http_response_code(400); echo json_encode(['error'=>'Invalid date format (YYYY-MM-DD)']); exit;
}
if (!preg_match('/^\d{2}:\d{2}:\d{2}$/', $cand['from_time'])) {
  http_response_code(400); echo json_encode(['error'=>'Invalid from_time (HH:MM or HH:MM:SS)']); exit;
}
if (!preg_match('/^\d{2}:\d{2}:\d{2}$/', $cand['to_time'])) {
  http_response_code(400); echo json_encode(['error'=>'Invalid to_time (HH:MM or HH:MM:SS)']); exit;
}

// 4) Ensure order
if (strcmp($cand['from_time'], $cand['to_time']) >= 0) {
  http_response_code(400); echo json_encode(['error'=>'from_time must be earlier than to_time']); exit;
}

// 5) Overlap checks (exclude this id; ignore canceled)
// Overlap checks (exclude this id; ignore canceled)
$overlapCheck = function($col, $val) use ($mysqli, $cand, $id) {
  $sql = "
    SELECT id FROM Appointments
    WHERE `$col` = ?
      AND `date` = ?
      AND status <> 'canceled'
      AND id <> ?
      AND TIMESTAMP(?, ?) < TIMESTAMP(`date`, `to_time`)
      AND TIMESTAMP(?, ?) > TIMESTAMP(`date`, `from_time`)
    LIMIT 1
  ";
  $stmt = $mysqli->prepare($sql);
  // types: i s i s s s s
  $stmt->bind_param(
    'isissss',
    $val,
    $cand['date'],
    $id,
    $cand['date'], $cand['to_time'],
    $cand['date'], $cand['from_time']
  );
  $stmt->execute();
  $exists = (bool)$stmt->get_result()->fetch_assoc();
  $stmt->close();
  return $exists;
};
if ($overlapCheck('doctorId', (int)$cand['doctorId'])) { http_response_code(409); echo json_encode(['error'=>'Time conflict: doctor already booked for this slot.']); exit; }
if ($overlapCheck('roomID',   (int)$cand['roomId']))   { http_response_code(409); echo json_encode(['error'=>'Time conflict: room already booked for this slot.']); exit; }


// 6) Perform update (COALESCE keeps old values when NULL passed)
// Also bump updatedAt
$stmt = $mysqli->prepare("
  UPDATE Appointments
     SET doctorId  = ?,
         roomId    = ?,
         date      = ?,
         from_time = ?,
         to_time   = ?,
         summary   = COALESCE(?, summary),
         comment   = COALESCE(?, comment),
         updatedAt = NOW()
   WHERE id = ?
");
$stmt->bind_param(
  'iisssssi',
  $cand['doctorId'],
  $cand['roomId'],
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
