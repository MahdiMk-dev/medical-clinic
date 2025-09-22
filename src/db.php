<?php
/**
 * db.php
 * Loads config.php and opens a mysqli connection in $mysqli.
 * On failure, returns a JSON error and exits (safe for API endpoints).
 */

declare(strict_types=1);

// Throw exceptions for mysqli errors (cleaner to handle)
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// Resolve config.php path robustly
$projectRoot = dirname(__DIR__); // C:\wamp64\www\medical_clinic
$configPath  = $projectRoot . DIRECTORY_SEPARATOR . 'config.php';

// Ensure config file exists
if (!is_file($configPath)) {
    // Send JSON if possible
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    http_response_code(500);
    echo json_encode(['error' => 'Config file not found', 'path' => $configPath]);
    exit;
}

$config = include $configPath;

// Basic validation
foreach (['db_host','db_user','db_pass','db_name'] as $k) {
    if (!array_key_exists($k, $config)) {
        if (!headers_sent()) {
            header('Content-Type: application/json');
        }
        http_response_code(500);
        echo json_encode(['error' => "Missing '$k' in config.php"]);
        exit;
    }
}

try {
    $mysqli = new mysqli(
        $config['db_host'],
        $config['db_user'],
        $config['db_pass'],
        $config['db_name'],
        $config['db_port'] ?? 3306
    );
    $mysqli->set_charset('utf8mb4');
} catch (Throwable $e) {
    if (!headers_sent()) {
        header('Content-Type: application/json');
    }
    http_response_code(500);
    echo json_encode([
        'error' => 'Database connection failed',
        'details' => (isset($config['app_env']) && $config['app_env'] === 'local') ? $e->getMessage() : null
    ]);
    exit;
}
