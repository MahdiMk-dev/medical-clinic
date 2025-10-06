<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

$auth = require_auth();

// Filters
$date = $_GET['date'] ?? date('Y-m-d');
$q = trim($_GET['q'] ?? '');
$status = trim($_GET['status'] ?? '');
$type = trim($_GET['type'] ?? '');

$sql = "
SELECT 
  a.id,
  DATE_FORMAT(a.from_time, '%H:%i') AS from_time,
  DATE_FORMAT(a.to_time, '%H:%i') AS to_time,
  CONCAT(DATE_FORMAT(a.from_time, '%H:%i'), '–', DATE_FORMAT(a.to_time, '%H:%i')) AS time,
  CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
  CONCAT(d.fName, ' ', d.lName) AS doctor_name,
  r.id AS room,
  a.type,
  a.status,
  a.comment,
  a.summary
FROM Appointments a
JOIN Patients p ON p.id = a.patientID
JOIN Doctors d ON d.id = a.doctorId
LEFT JOIN Rooms r ON r.id = a.roomID
WHERE a.date = ?
";

$params = [$date];
$types = "s";

if ($status !== '') {
  $sql .= " AND a.status = ?";
  $params[] = $status;
  $types .= "s";
}
if ($type !== '') {
  $sql .= " AND a.type = ?";
  $params[] = $type;
  $types .= "s";
}
if ($q !== '') {
  $sql .= " AND (p.first_name LIKE ? OR p.last_name LIKE ? OR d.fName LIKE ? OR d.lName LIKE ?)";
  $like = "%$q%";
  $params = array_merge($params, [$like, $like, $like, $like]);
  $types .= "ssss";
}

$sql .= " ORDER BY a.from_time ASC";

$stmt = $mysqli->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$res = $stmt->get_result();

$appointments = [];
while ($row = $res->fetch_assoc()) $appointments[] = $row;

$stmt->close();
echo json_encode(['appointments' => $appointments]);
