<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

$auth = require_auth(); // enforce JWT

$q = trim($_GET['q'] ?? '');
$limit = max(1, min(500, intval($_GET['limit'] ?? 200)));

if ($q !== '') {
    $like = '%' . $q . '%';
    $sql = "SELECT `id`,`first_name`,`last_name`,`phone`,`email`,`address`,
                   DATE_FORMAT(`dob`,'%Y-%m-%d') AS `dob`,
                   DATE_FORMAT(`created_at`,'%Y-%m-%d %H:%i:%s') AS `created_at`
            FROM `Patients`
            WHERE `first_name` LIKE ? OR `last_name` LIKE ? OR `phone` LIKE ?
               OR `email` LIKE ? OR `address` LIKE ?
            ORDER BY `last_name`, `first_name`
            LIMIT ?";
    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param('sssssi', $like, $like, $like, $like, $like, $limit);
} else {
    $sql = "SELECT `id`,`first_name`,`last_name`,`phone`,`email`,`address`,
                   DATE_FORMAT(`dob`,'%Y-%m-%d') AS `dob`,
                   DATE_FORMAT(`created_at`,'%Y-%m-%d %H:%i:%s') AS `created_at`
            FROM `Patients`
            ORDER BY `last_name`, `first_name`
            LIMIT ?";
    $stmt = $mysqli->prepare($sql);
    $stmt->bind_param('i', $limit);
}

$stmt->execute();
$res = $stmt->get_result();
$rows = $res->fetch_all(MYSQLI_ASSOC);
$stmt->close();

echo json_encode(['patients' => $rows]);
