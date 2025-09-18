<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

$auth = require_auth(); // returns payload
$input = json_decode(file_get_contents('php://input'), true);

$patient_id = intval($input['patient_id'] ?? 0);
$doctor_id  = intval($input['doctor_id'] ?? 0);
$room_id    = intval($input['room_id'] ?? 0);
$service_id = intval($input['service_id'] ?? 0);
$datetime   = $input['appointment_time'] ?? null;
$comment    = $input['comment'] ?? '';

if (!$patient_id || !$datetime) {
    http_response_code(400);
    echo json_encode(['error' => 'patient_id and appointment_time required']);
    exit;
}

$stmt = $mysqli->prepare("INSERT INTO appointments (patient_id, doctor_id, room_id, service_id, appointment_time, status, created_by, comment) VALUES (?, ?, ?, ?, ?, 'assigned', ?, ?)");
$stmt->bind_param('iiiisis', $patient_id, $doctor_id, $room_id, $service_id, $datetime, $auth['sub'], $comment);
$ok = $stmt->execute();
if (!$ok) {
    http_response_code(500);
    echo json_encode(['error' => $stmt->error]);
    exit;
}
$appointment_id = $stmt->insert_id;
$stmt->close();

// Optionally add a log entry
$logStmt = $mysqli->prepare("INSERT INTO logs (user_id, action, meta) VALUES (?, ?, ?)");
$action = 'create_appointment';
$meta = json_encode(['appointment_id'=>$appointment_id]);
$logStmt->bind_param('iss', $auth['sub'], $action, $meta);
$logStmt->execute();
$logStmt->close();

echo json_encode(['ok'=>true,'appointment_id'=>$appointment_id]);
