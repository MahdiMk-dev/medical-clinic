<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

try {
  $auth = require_auth();

  $input = json_decode(file_get_contents('php://input'), true) ?? [];

  $doctorId  = (int)($input['doctorId']  ?? 0);
  $patientId = (int)($input['patientId'] ?? 0);
  $roomId    = (int)($input['roomId']    ?? 0);

  $date      = trim((string)($input['date'] ?? ''));      // YYYY-MM-DD
  $from_time = trim((string)($input['from_time'] ?? '')); // HH:MM or HH:MM:SS
  $to_time   = trim((string)($input['to_time']   ?? '')); // HH:MM or HH:MM:SS

  $type      = trim((string)($input['type']    ?? 'Consultation'));
  $summary   = trim((string)($input['summary'] ?? ''));
  $comment   = trim((string)($input['comment'] ?? ''));

  // chargesId may come as chargesId or chargesID
  $chargesId = isset($input['chargesId']) ? (int)$input['chargesId']
             : (isset($input['chargesID']) ? (int)$input['chargesID'] : 0);

  // Normalize time to HH:MM:SS
  $normalizeTime = function($t) {
    if ($t === '') return '';
    if (preg_match('/^\d{2}:\d{2}$/', $t)) return $t . ':00';
    if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $t)) return $t;
    return '';
  };
  $from_time = $normalizeTime($from_time);
  $to_time   = $normalizeTime($to_time);

  // Validate presence
  $missing = [];
  if (!$patientId) $missing[] = 'patientId';
  if (!$doctorId)  $missing[] = 'doctorId';
  if (!$roomId)    $missing[] = 'roomId';
  if ($date === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) $missing[] = 'date (YYYY-MM-DD)';
  if ($from_time === '') $missing[] = 'from_time (HH:MM or HH:MM:SS)';
  if ($to_time === '')   $missing[] = 'to_time (HH:MM or HH:MM:SS)';
  if ($missing) { http_response_code(400); echo json_encode(['error'=>'Missing or invalid fields','missing'=>$missing]); exit; }

  // Order check
  if (strcmp($from_time, $to_time) >= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'from_time must be earlier than to_time']);
    exit;
  }

  // FK existence (light check)
  $checkId = function($table, $col, $val) use ($mysqli) {
    $stmt = $mysqli->prepare("SELECT 1 FROM `$table` WHERE `$col`=? LIMIT 1");
    $stmt->bind_param('i', $val);
    $stmt->execute();
    $ok = (bool)$stmt->get_result()->fetch_row();
    $stmt->close();
    return $ok;
  };
  if (!$checkId('Patients','id',$patientId)) { http_response_code(400); echo json_encode(['error'=>'Invalid patientId']); exit; }
  if (!$checkId('Doctors','id',$doctorId))   { http_response_code(400); echo json_encode(['error'=>'Invalid doctorId']); exit; }
  if (!$checkId('Rooms','id',$roomId))       { http_response_code(400); echo json_encode(['error'=>'Invalid roomId']); exit; }

  // Ensure a Charges row
  if ($chargesId <= 0) {
    $res = $mysqli->query("SELECT id FROM Charges WHERE description='Unassigned' LIMIT 1");
    if ($row = $res->fetch_assoc()) {
      $chargesId = (int)$row['id'];
    } else {
      $stmt = $mysqli->prepare("INSERT INTO Charges (amount, description) VALUES (0.00, 'Unassigned')");
      $stmt->execute();
      $chargesId = $stmt->insert_id;
      $stmt->close();
    }
  }

  // ---------- OVERLAP CHECKS (doctor OR room OR patient) ----------
  // Overlap iff NOT ( new_to <= existing_from OR new_from >= existing_to )
  $conflict = function($col, $val) use ($mysqli, $date, $from_time, $to_time) {
    $sql = "
      SELECT id FROM Appointments
      WHERE `$col` = ?
        AND `date` = ?
        AND LOWER(status) <> 'canceled'
        AND NOT ( ? <= from_time OR ? >= to_time )
      LIMIT 1
    ";
    $stmt = $mysqli->prepare($sql);
    // types: i s s s  => int, date, new_to, new_from
    $stmt->bind_param('isss', $val, $date, $to_time, $from_time);
    $stmt->execute();
    $hit = (bool)$stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $hit;
  };

  if ($conflict('doctorId',  $doctorId))  { http_response_code(409); echo json_encode(['error'=>'Time conflict: doctor already booked for this slot.']);  exit; }
  if ($conflict('roomID',    $roomId))    { http_response_code(409); echo json_encode(['error'=>'Time conflict: room already booked for this slot.']);    exit; }
  if ($conflict('patientID', $patientId)) { http_response_code(409); echo json_encode(['error'=>'Time conflict: patient already booked for this slot.']); exit; }

  // Insert
  $status    = 'scheduled'; // DB enum: scheduled/completed/no-show/rescheduled/canceled
  $createdBy = (int)($auth['sub'] ?? 0);
  $editBy    = $createdBy;

  $sql = "INSERT INTO `Appointments`
          (`doctorId`,`patientID`,`roomID`,`from_time`,`to_time`,`date`,
           `summary`,`chargesID`,`comment`,`type`,`status`,`clearance`,
           `createdBy`,`editBy`,`createdAt`,`updatedAt`)
          VALUES (?,?,?,?,?,?,?,
                  ?,?,?,?,'pending',
                  ?,?, NOW(), NOW())";
  $stmt = $mysqli->prepare($sql);
  $stmt->bind_param('iiissssisssii',
    $doctorId, $patientId, $roomId,
    $from_time, $to_time, $date,
    $summary, $chargesId, $comment, $type, $status,
    $createdBy, $editBy
  );
  $stmt->execute();
  $newId = $stmt->insert_id;
  $stmt->close();

  echo json_encode(['ok'=>true, 'id'=>$newId]);

} catch (mysqli_sql_exception $e) {
  http_response_code(500);
  echo json_encode(['error'=>'SQL error','detail'=>$e->getMessage()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error'=>'Server error','detail'=>$e->getMessage()]);
}
