<?php
// CORS (adjust if your frontend origin differs)
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
header('Content-Type: application/json');

require_once __DIR__ . '/../src/db.php';   // $mysqli, $config
require_once __DIR__ . '/../src/jwt.php';  // jwt_decode() or your equivalent

// ---- Auth ----
function get_bearer_token(): ?string {
  $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!$hdr && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    $hdr = $headers['Authorization'] ?? $headers['authorization'] ?? '';
  }
  if (preg_match('/Bearer\s+(.+)/i', $hdr, $m)) return trim($m[1]);
  return null;
}

$token = get_bearer_token();
if (!$token) { http_response_code(401); echo json_encode(['error'=>'Missing token']); exit; }

try {
  $claims = jwt_decode($token, $config['jwt_secret']);
} catch (Throwable $e) {
  http_response_code(401);
  echo json_encode(['error'=>'Invalid token']);
  exit;
}

// ---- Inputs ----
$date     = $_GET['date']     ?? date('Y-m-d');
$q        = trim($_GET['q']   ?? '');
$status   = trim($_GET['status'] ?? '');
$type     = trim($_GET['type']   ?? '');
$sort_by  = $_GET['sort_by']  ?? 'time';
$sort_dir = strtolower($_GET['sort_dir'] ?? 'asc');

// map UI sort keys → actual columns
$sortMap = [
  'time'         => 'a.`from_time`',
  'patient_name' => 'p.`last_name`, p.`first_name`',
  'doctor_name'  => 'd.`lName`, d.`fName`',
  'room'         => 'r.`id`',
  'type'         => 'a.`type`',
  'status'       => 'a.`status`',
  'summary'      => 'a.`summary`'
];
$orderCol = $sortMap[$sort_by] ?? 'a.`from_time`';
$orderDir = ($sort_dir === 'desc') ? 'DESC' : 'ASC';

// ---- Query ----
$sql = "
  SELECT
    a.`id`,
    DATE_FORMAT(a.`from_time`, '%H:%i') AS start_time,
    DATE_FORMAT(a.`to_time`,   '%H:%i') AS end_time,
    CONCAT(p.`first_name`, ' ', p.`last_name`) AS patient_name,
    CONCAT(d.`fName`, ' ', d.`lName`)          AS doctor_name,
    r.`id`                                     AS room,
    a.`type`,
    a.`status`,
    a.`summary`
  FROM `Appointments` a
  JOIN `Patients`  p ON p.`id` = a.`patientId`
  JOIN `Doctors`   d ON d.`id` = a.`doctorId`
  LEFT JOIN `Rooms` r ON r.`id` = a.`roomId`
  WHERE a.`date` = ?
";

$params = [$date];
$types  = "s";

if ($status !== '') {
  $sql .= " AND a.`status` = ? ";
  $params[] = $status; $types .= "s";
}
if ($type !== '') {
  $sql .= " AND a.`type` = ? ";
  $params[] = $type; $types .= "s";
}

if ($q !== '') {
  $sql .= " AND (p.`first_name` LIKE CONCAT('%', ?, '%')
            OR   p.`last_name`  LIKE CONCAT('%', ?, '%')
            OR   d.`fName`      LIKE CONCAT('%', ?, '%')
            OR   d.`lName`      LIKE CONCAT('%', ?, '%')
            OR   CAST(r.`id` AS CHAR) LIKE CONCAT('%', ?, '%')
            OR   a.`summary`    LIKE CONCAT('%', ?, '%'))";
  array_push($params, $q, $q, $q, $q, $q, $q);
  $types .= "ssssss";
}

$sql .= " ORDER BY $orderCol $orderDir ";

$stmt = $mysqli->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$res = $stmt->get_result();

$rows = [];
while ($r = $res->fetch_assoc()) {
  $rows[] = [
    'id'           => (int)$r['id'],
    'time'         => $r['start_time'] . '–' . $r['end_time'],
    'patient_name' => $r['patient_name'],
    'doctor_name'  => $r['doctor_name'],
    'room'         => $r['room'],   // room id as “room number”
    'type'         => $r['type'],
    'status'       => $r['status'],
    'summary'      => $r['summary'],
  ];
}
$stmt->close();

echo json_encode(['appointments' => $rows]);
