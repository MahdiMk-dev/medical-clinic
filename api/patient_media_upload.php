<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

// Ensure media table exists (lightweight)
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

    $patientId = isset($_POST['patient_id']) ? (int)$_POST['patient_id'] : 0;
    $category  = strtolower(trim($_POST['category'] ?? ''));
    $title     = trim($_POST['title'] ?? '');

    $allowedCats = ['labs', 'imaging', 'reports'];
    if ($patientId <= 0) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Missing patient_id']); exit; }
    if (!in_array($category, $allowedCats, true)) { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Invalid category']); exit; }
    if ($title === '') { http_response_code(422); echo json_encode(['ok'=>false,'error'=>'Title required']); exit; }

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(422);
        echo json_encode(['ok'=>false, 'error'=>'File is required']);
        exit;
    }

    $file = $_FILES['file'];
    $origName = $file['name'];
    $tmpPath = $file['tmp_name'];
    $mime = mime_content_type($tmpPath) ?: ($file['type'] ?? 'application/octet-stream');

    // basic mime allow-list
    $allowedMime = [
        'image/jpeg','image/png','image/gif','image/webp',
        'application/pdf'
    ];
    if (!in_array($mime, $allowedMime, true)) {
        http_response_code(415);
        echo json_encode(['ok'=>false,'error'=>'Unsupported file type']);
        exit;
    }

    $ext = pathinfo($origName, PATHINFO_EXTENSION);
    $ext = $ext ? ('.' . preg_replace('/[^a-zA-Z0-9]+/', '', $ext)) : '';
    $destDir = realpath(__DIR__ . '/../public') . '/uploads/media';
    if (!is_dir($destDir)) {
        if (!mkdir($destDir, 0775, true) && !is_dir($destDir)) {
            http_response_code(500);
            echo json_encode(['ok'=>false,'error'=>'Failed to create upload dir']);
            exit;
        }
    }
    $filename = sprintf('p%s_%s%s', $patientId, bin2hex(random_bytes(5)), $ext);
    $destPath = $destDir . '/' . $filename;

    if (!move_uploaded_file($tmpPath, $destPath)) {
        http_response_code(500);
        echo json_encode(['ok'=>false,'error'=>'Failed to save file']);
        exit;
    }

    $relPath = '/uploads/media/' . $filename; // relative to /public
    $createdBy = (int)($auth['sub'] ?? null);

    $stmt = $mysqli->prepare("INSERT INTO patient_media (patient_id, category, title, file_path, mime, created_by) VALUES (?,?,?,?,?,?)");
    $stmt->bind_param('issssi', $patientId, $category, $title, $relPath, $mime, $createdBy);
    $stmt->execute();
    $newId = $stmt->insert_id;
    $stmt->close();

    $stmt = $mysqli->prepare("SELECT id, patient_id, category, title, file_path, mime, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at FROM patient_media WHERE id=? LIMIT 1");
    $stmt->bind_param('i', $newId);
    $stmt->execute();
    $record = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    $record['url'] = '/medical_clinic/public' . $record['file_path'];

    echo json_encode(['ok'=>true, 'media'=>$record]);
} catch (mysqli_sql_exception $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'SQL error','detail'=>$e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>'Server error','detail'=>$e->getMessage()]);
}
