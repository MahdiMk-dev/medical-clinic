<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, DELETE, OPTIONS");
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

    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $id = isset($input['id']) ? (int)$input['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);
    if ($id <= 0) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Missing id']); exit; }

    $stmt = $mysqli->prepare("SELECT file_path FROM patient_media WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row) { http_response_code(404); echo json_encode(['ok'=>false,'error'=>'Media not found']); exit; }

    // Delete file if present
    $filePath = $row['file_path'] ?? '';
    if ($filePath) {
        $abs = realpath(__DIR__ . '/../public' . $filePath);
        $base = realpath(__DIR__ . '/../public/uploads/media');
        if ($abs && $base && strpos($abs, $base) === 0 && file_exists($abs)) {
            @unlink($abs);
        }
    }

    $del = $mysqli->prepare("DELETE FROM patient_media WHERE id=? LIMIT 1");
    $del->bind_param('i', $id);
    $del->execute();
    $del->close();

    echo json_encode(['ok'=>true]);
} catch (mysqli_sql_exception $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'SQL error','detail'=>$e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'Server error','detail'=>$e->getMessage()]);
}
