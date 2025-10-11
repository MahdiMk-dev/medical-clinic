<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';
require_once __DIR__ . '/../src/appointments_lib.php';

$auth = require_auth();

$input = json_decode(file_get_contents('php://input'), true);
$id        = (int)($input['id'] ?? 0);
$newStart  = trim($input['start'] ?? ''); // 'YYYY-MM-DD HH:MM:SS'
$newEnd    = trim($input['end']   ?? ''); // 'YYYY-MM-DD HH:MM:SS'

if (!$id || !$newStart || !$newEnd) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Missing id/start/end']);
  exit;
}

// Load the current appt (we need doctorID, patientID, roomID)
$stmt = $mysqli->prepare("
  SELECT id, doctorID, patientID, roomID
  FROM Appointments
  WHERE id = ?
  LIMIT 1
");
$stmt->bind_param('i', $id);
$stmt->execute();
$curr = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$curr) {
  http_response_code(404);
  echo json_encode(['ok' => false, 'error' => 'Appointment not found']);
  exit;
}

$doctorId  = (int)$curr['doctorID'];
$patientId = (int)$curr['patientID'];
$roomId    = (int)$curr['roomID'];

// Validate times
if (strtotime($newEnd) <= strtotime($newStart)) {
  http_response_code(422);
  echo json_encode(['ok' => false, 'error' => 'end must be after start']);
  exit;
}

// Overlap check
$conflicts = count_overlaps($mysqli, $doctorId, $roomId, $patientId, $newStart, $newEnd, $id);
if ($conflicts > 0) {
  http_response_code(409);
  echo json_encode(['ok' => false, 'error' => 'Overlapping with another appointment']);
  exit;
}

// Apply update
$newDate     = substr($newStart, 0, 10);
$newFromTime = substr($newStart, 11, 8);
$newToTime   = substr($newEnd,   11, 8);

$stmt = $mysqli->prepare("
  UPDATE Appointments
     SET date = ?, from_time = ?, to_time = ?
   WHERE id = ?
  LIMIT 1
");
$stmt->bind_param('sssi', $newDate, $newFromTime, $newToTime, $id);

if (!$stmt->execute()) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => $stmt->error]);
  $stmt->close();
  exit;
}

$stmt->close();
echo json_encode(['ok' => true, 'id' => $id, 'date' => $newDate, 'from_time' => $newFromTime, 'to_time' => $newToTime]);
