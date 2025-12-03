<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

$auth = require_auth();

// Auto-mark past scheduled appointments as no-show
$mysqli->query("UPDATE Appointments SET status='no-show' WHERE LOWER(status)='scheduled' AND `date` < CURDATE()");

/**
 * Filters
 *  - date   (YYYY-MM-DD)  defaults to today
 *  - q      (search)      matches patient/doctor/summary/comment
 *  - status
 *  - type
 */
$date   = $_GET['date']   ?? date('Y-m-d');
$q      = trim($_GET['q'] ?? '');
$status = trim($_GET['status'] ?? '');
$type   = trim($_GET['type'] ?? '');

$where   = [];
$params  = [];
$types   = '';

// Correct: filter by the DATE column, not from_time
$where[]  = "a.`date` = ?";
$params[] = $date;
$types   .= 's';

// Search across patient, doctor, summary, comment
if ($q !== '') {
  $where[]  = "(CONCAT(p.first_name, ' ', p.last_name) LIKE ? OR CONCAT(d.fName, ' ', d.lName) LIKE ? OR a.summary LIKE ? OR a.comment LIKE ?)";
  $like     = "%$q%";
  array_push($params, $like, $like, $like, $like);
  $types   .= 'ssss';
}

// Status filter (default exclude canceled)
if ($status !== '') {
  $where[]  = "a.status = ?";
  $params[] = $status;
  $types   .= 's';
} else {
  $where[] = "LOWER(a.status) <> 'canceled'";
}

// Type filter
if ($type !== '') {
  $where[]  = "a.type = ?";
  $params[] = $type;
  $types   .= 's';
}

$sql = "
SELECT
  a.id,
  DATE_FORMAT(a.from_time, '%H:%i') AS from_time,
  DATE_FORMAT(a.to_time,   '%H:%i') AS to_time,
  CONCAT(DATE_FORMAT(a.from_time, '%H:%i'), '-', DATE_FORMAT(a.to_time, '%H:%i')) AS time,
  p.id AS patient_id,
  CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
  CONCAT(d.fName, ' ', d.lName) AS doctor_name,
  r.id AS room,
  CONCAT('Room ', r.id, ' - ', COALESCE(r.type, 'General')) AS room_name,
  a.type,
  a.status,
  a.comment,
  a.summary
FROM Appointments a
JOIN Patients p ON p.id = a.patientID
JOIN Doctors  d ON d.id = a.doctorId
LEFT JOIN Rooms    r ON r.id = a.roomID
";

if (!empty($where)) {
  $sql .= " WHERE " . implode(" AND ", $where);
}
$sql .= " ORDER BY a.from_time ASC";

$stmt = $mysqli->prepare($sql);
if (!$stmt) {
  http_response_code(500);
  echo json_encode(['error' => 'Failed to prepare statement']);
  exit;
}

$stmt->bind_param($types, ...$params);
$stmt->execute();
$res = $stmt->get_result();

$appointments = [];
while ($row = $res->fetch_assoc()) {
  $appointments[] = $row;
}

$stmt->close();
echo json_encode(['appointments' => $appointments]);
