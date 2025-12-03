<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

function ensure_media_table(mysqli $mysqli) {
    $mysqli->query("
        CREATE TABLE IF NOT EXISTS `patient_media` (
            `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
            `patient_id` INT UNSIGNED NOT NULL,
            `category` VARCHAR(32) NOT NULL,
            `title` VARCHAR(255) NOT NULL,
            `file_path` VARCHAR(255) NOT NULL,
            `mime` VARCHAR(80) DEFAULT NULL,
            `created_by` INT UNSIGNED DEFAULT NULL,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            INDEX (`patient_id`),
            INDEX (`category`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
}

try {
    $auth = require_auth();
    ensure_media_table($mysqli);

    $patientId = isset($_GET['patient_id']) ? (int)$_GET['patient_id'] : 0;
    if ($patientId <= 0) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Missing patient_id']); exit; }

    $stmt = $mysqli->prepare("
        SELECT id, patient_id, category, title, file_path, mime,
               DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at
        FROM patient_media
        WHERE patient_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 500
    ");
    $stmt->bind_param('i', $patientId);
    $stmt->execute();
    $res = $stmt->get_result();
    $rows = [];
    while ($r = $res->fetch_assoc()) {
        $r['url'] = '/medical_clinic/public' . $r['file_path'];
        $rows[] = $r;
    }
    $stmt->close();

    echo json_encode(['ok'=>true, 'media'=>$rows]);
} catch (mysqli_sql_exception $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'SQL error','detail'=>$e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'Server error','detail'=>$e->getMessage()]);
}
