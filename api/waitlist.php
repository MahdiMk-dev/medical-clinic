<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

try {
  $auth = require_auth();

  // Show pending + notified only
  $sql = "
    SELECT w.id, w.patient_id, w.notes, w.created_at, w.status,
           CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,'')) AS patient_name
    FROM waitlist w
    LEFT JOIN Patients p ON p.id = w.patient_id
    WHERE w.status IN ('pending','notified')
    ORDER BY w.created_at ASC, w.id ASC
  ";
  $res = $mysqli->query($sql);
  $rows = [];
  while ($r = $res->fetch_assoc()) $rows[] = $r;

  echo json_encode(['rows' => $rows]);
} catch (mysqli_sql_exception $e) {
  http_response_code(500);
  echo json_encode(['error'=>'SQL error','detail'=>$e->getMessage()]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error'=>'Server error','detail'=>$e->getMessage()]);
}
