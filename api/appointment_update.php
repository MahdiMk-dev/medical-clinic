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

// --- Input (partial updates allowed) ---
$input = json_decode(file_get_contents('php://input'), true) ?? [];
$id = (int)($input['id'] ?? 0);
if (!$id) { http_response_code(400); echo json_encode(['error'=>'Missing id']); exit; }

/**
 * If a field is absent or empty, send NULL so COALESCE keeps the current DB value.
 * For strings we treat empty string "" as "keep old" too (set to NULL).
 */
$date      = (isset($input['date'])      && $input['date']      !== '') ? $input['date']      : null;
$from_time = (isset($input['from_time']) && $input['from_time'] !== '') ? $input['from_time'] : null;
$to_time   = (isset($input['to_time'])   && $input['to_time']   !== '') ? $input['to_time']   : null;
$doctorId  = (isset($input['doctorId'])  && $input['doctorId'])         ? (int)$input['doctorId'] : null;
$roomId    = (isset($input['roomId'])    && $input['roomId'])           ? (int)$input['roomId']   : null;
// summary/comment: if key present but "", we keep old (set NULL -> COALESCE keeps column)
$summary   = array_key_exists('summary', $input) ? (trim($input['summary']) === '' ? null : trim($input['summary'])) : null;
$comment   = array_key_exists('comment', $input) ? (trim($input['comment']) === '' ? null : trim($input['comment'])) : null;

// --- Update with COALESCE to preserve old values when NULL is passed ---
$stmt = $mysqli->prepare("
  UPDATE Appointments
     SET doctorId  = COALESCE(?, doctorId),
         roomId    = COALESCE(?, roomId),
         date      = COALESCE(?, date),
         from_time = COALESCE(?, from_time),
         to_time   = COALESCE(?, to_time),
         summary   = COALESCE(?, summary),
         comment   = COALESCE(?, comment)
   WHERE id = ?
");
/**
 * types: i (doctorId) + i (roomId) + s (date) + s (from_time) + s (to_time) + s (summary) + s (comment) + i (id)
 * => "iisssssi"
 */
$stmt->bind_param(
  'iisssssi',
  $doctorId, $roomId, $date, $from_time, $to_time, $summary, $comment, $id
);
$stmt->execute();
$aff = $stmt->affected_rows;
$stmt->close();

echo json_encode(['ok'=>true, 'updated'=>$aff]);
