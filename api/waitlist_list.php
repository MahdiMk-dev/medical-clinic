<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

function col_exists(mysqli $db, string $table, string $col): bool {
  $sql = "SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME   = ?
             AND COLUMN_NAME  = ?
           LIMIT 1";
  $stmt = $db->prepare($sql);
  $stmt->bind_param('ss', $table, $col);
  $stmt->execute();
  $ok = (bool)$stmt->get_result()->fetch_row();
  $stmt->close();
  return $ok;
}

try {
  $auth = require_auth();

  $hasDoctorId      = col_exists($mysqli, 'waitlist', 'doctor_id');
  $hasAppointmentId = col_exists($mysqli, 'waitlist', 'appointment_id');

  $sel_ids = $hasDoctorId ? "w.doctor_id, " : "NULL AS doctor_id, ";
  $sel_appt = $hasAppointmentId ? "w.appointment_id, " : "NULL AS appointment_id, ";

  // resolve doctor name (via waitlist.doctor_id first; else via appointment → doctor)
  if ($hasDoctorId && $hasAppointmentId) {
    $sel_docname = "COALESCE(
      (SELECT CONCAT(d1.fName,' ',d1.lName) FROM Doctors d1 WHERE d1.id = w.doctor_id),
      (SELECT CONCAT(d2.fName,' ',d2.lName)
         FROM Appointments a2
         JOIN Doctors d2 ON d2.id = a2.doctorId
        WHERE a2.id = w.appointment_id)
    ) AS doctor_name";
  } elseif ($hasDoctorId) {
    $sel_docname = "(SELECT CONCAT(d1.fName,' ',d1.lName) FROM Doctors d1 WHERE d1.id = w.doctor_id) AS doctor_name";
  } elseif ($hasAppointmentId) {
    $sel_docname = "(SELECT CONCAT(d2.fName,' ',d2.lName)
                      FROM Appointments a2
                      JOIN Doctors d2 ON d2.id = a2.doctorId
                     WHERE a2.id = w.appointment_id) AS doctor_name";
  } else {
    $sel_docname = "NULL AS doctor_name";
  }

  $base = "
    w.id, w.patient_id, w.notes, w.created_at, w.status,
    $sel_ids
    $sel_appt
    CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,'')) AS patient_name,
    p.phone,
    $sel_docname
    FROM waitlist w
    LEFT JOIN Patients p ON p.id = w.patient_id
  ";

  $sqlActive = "SELECT $base WHERE w.status IN ('pending','notified') ORDER BY w.created_at ASC, w.id ASC";
  $sqlExpired = "SELECT $base WHERE w.status IN ('scheduled','canceled') ORDER BY w.created_at DESC, w.id DESC";

  $resA = $mysqli->query($sqlActive);
  $active = [];
  while ($r = $resA->fetch_assoc()) $active[] = $r;

  $resE = $mysqli->query($sqlExpired);
  $expired = [];
  while ($r = $resE->fetch_assoc()) $expired[] = $r;

  echo json_encode(['active' => $active, 'expired' => $expired], JSON_UNESCAPED_UNICODE);

} catch (mysqli_sql_exception $e) {
  http_response_code(500);
  echo json_encode(['error'=>'SQL error','detail'=>$e->getMessage()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error'=>'Server error','detail'=>$e->getMessage()]);
}
