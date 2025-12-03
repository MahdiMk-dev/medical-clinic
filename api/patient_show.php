<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

try {
  $auth = require_auth();

  $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
  if ($id <= 0) { http_response_code(400); echo json_encode(['error'=>'Missing id']); exit; }

  // Patient demographics
  $stmt = $mysqli->prepare("
    SELECT id, first_name, last_name, phone, email, address, dob,
           medical_history, surgical_history, allergies,
           DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
    FROM Patients
    WHERE id = ?
    LIMIT 1
  ");
  $stmt->bind_param('i', $id);
  $stmt->execute();
  $res = $stmt->get_result();
  $patient = $res->fetch_assoc();
  $stmt->close();

  if (!$patient) { http_response_code(404); echo json_encode(['error'=>'Patient not found']); exit; }

  // Appointments (join Doctor + Room)
  $stmt2 = $mysqli->prepare("
    SELECT
      a.id,
      a.date,
      DATE_FORMAT(a.from_time, '%H:%i') AS start_time,
      DATE_FORMAT(a.to_time,   '%H:%i') AS end_time,
      a.doctorId,
      a.roomID,
      CONCAT('Dr. ', d.fName, ' ', d.lName) AS doctor_name,
      CONCAT('Room ', r.id, IF(r.type IS NULL OR r.type='', '', CONCAT(' — ', r.type))) AS room,
      a.type,
      a.status,
      a.summary,
      a.comment,
      a.vitals_bp,
      a.vitals_hr,
      a.vitals_temp,
      a.vitals_rr,
      a.vitals_spo2,
      a.vitals_notes
    FROM Appointments a
    JOIN Doctors d ON d.id = a.doctorId
    LEFT JOIN Rooms r ON r.id = a.roomID
    WHERE a.patientID = ?
    ORDER BY a.date ASC, a.from_time ASC
  ");
  $stmt2->bind_param('i', $id);
  $stmt2->execute();
  $res2 = $stmt2->get_result();
  $appts = [];
  while ($row = $res2->fetch_assoc()) $appts[] = $row;
  $stmt2->close();

  echo json_encode(['patient'=>$patient, 'appointments'=>$appts]);

} catch (mysqli_sql_exception $e) {
  http_response_code(500);
  echo json_encode(['error'=>'SQL error','detail'=>$e->getMessage()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error'=>'Server error','detail'=>$e->getMessage()]);
}
