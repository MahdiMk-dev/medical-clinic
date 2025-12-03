<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

$auth = require_auth(); // ensures JWT is valid

// Auto-mark past scheduled appointments as no-show
$mysqli->query("UPDATE Appointments SET status='no-show' WHERE LOWER(status)='scheduled' AND `date` < CURDATE()");

// FullCalendar provides `start` and `end` as ISO strings
$start = $_GET['start'] ?? '';
$end   = $_GET['end']   ?? '';
if (!$start || !$end) {
  http_response_code(400);
  echo json_encode(['error' => 'Missing start or end']);
  exit;
}

// We’ll fetch by date BETWEEN, but we still compute precise overlap by time.
$stmt = $mysqli->prepare("
  SELECT
    a.id, a.patientID, a.doctorID, a.roomID, a.status, a.type,
    a.date,
    TIME_FORMAT(a.from_time, '%H:%i:%s') as from_time,
    TIME_FORMAT(a.to_time,   '%H:%i:%s') as to_time,
    p.first_name AS p_fn, p.last_name AS p_ln,
    d.fName AS d_fn, d.lName AS d_ln,
    r.type AS room_type
  FROM Appointments a
  LEFT JOIN Patients  p ON p.id = a.patientID
  LEFT JOIN Doctors   d ON d.id = a.doctorID
  LEFT JOIN Rooms     r ON r.id = a.roomID
  WHERE a.status <> 'canceled'
    AND a.date BETWEEN DATE(?) AND DATE(?)
  LIMIT 2000
");
$stmt->bind_param('ss', $start, $end);
$stmt->execute();
$res = $stmt->get_result();

$events = [];
while ($row = $res->fetch_assoc()) {
  $startDt = $row['date'].' '.$row['from_time'];
  $endDt   = $row['date'].' '.$row['to_time'];
  $title   = trim(($row['p_fn'] ?? '').' '.($row['p_ln'] ?? ''));
  $doc     = trim(($row['d_fn'] ?? '').' '.($row['d_ln'] ?? ''));
  $room    = $row['room_type'] ?? '';

  $events[] = [
    'id'    => (int)$row['id'],
    'title' => $title !== '' ? $title : 'Appointment',
    'start' => $startDt,
    'end'   => $endDt,
    'extendedProps' => [
      'patientID' => (int)$row['patientID'],
      'doctorID'  => (int)$row['doctorID'],
      'roomID'    => (int)$row['roomID'],
      'status'    => $row['status'],
      'type'      => $row['type'],
      'doctor'    => $doc,
      'room'      => $room,
    ],
  ];
}
$stmt->close();

echo json_encode($events);
