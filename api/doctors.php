<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

require_once __DIR__ . '/../src/db.php';
require_once __DIR__ . '/../src/auth_mw.php';

$auth = require_auth();

$q = trim($_GET['q'] ?? '');
$list = isset($_GET['list']); // dropdown mode

if ($list) {
    // ✅ Used for dropdowns (edit/create appointment)
    $sql = "SELECT id, CONCAT('Dr. ', fName, ' ', lName) AS name
            FROM Doctors
            ORDER BY lName, fName";
    $res = $mysqli->query($sql);

    $doctors = [];
    while ($row = $res->fetch_assoc()) {
        $doctors[] = $row;
    }

    echo json_encode(['doctors' => $doctors]);
    exit;
}

// ✅ Full listing or search
if ($q !== '') {
    $like = "%$q%";
    $stmt = $mysqli->prepare("
        SELECT id, fName, lName, mName, SyndicateNum, phone,
               DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') AS created_at
        FROM Doctors
        WHERE fName LIKE ? OR lName LIKE ? OR SyndicateNum LIKE ? OR phone LIKE ?
        ORDER BY lName, fName
        LIMIT 500
    ");
    $stmt->bind_param('ssss', $like, $like, $like, $like);
    $stmt->execute();
    $res = $stmt->get_result();
    $doctors = $res->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
} else {
    $sql = "
        SELECT id, fName, lName, mName, SyndicateNum, phone,
               DATE_FORMAT(createdAt, '%Y-%m-%d %H:%i:%s') AS created_at
        FROM Doctors
        ORDER BY lName, fName
        LIMIT 500
    ";
    $res = $mysqli->query($sql);
    $doctors = [];
    while ($row = $res->fetch_assoc()) {
        $doctors[] = $row;
    }
}

echo json_encode(['doctors' => $doctors]);
