<?php
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);
$db = Database::getInstance()->getConnection();

// GET - получение заказов
if ($method === 'GET') {
    session_start();
    if (isset($_SESSION['user_id'])) {
        $stmt = $db->prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$_SESSION['user_id']]);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'orders' => $orders]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Не авторизован']);
    }
    exit();
}

// POST - создание заказа
if ($method === 'POST') {
    session_start();
    
    if (!$data) {
        echo json_encode(['success' => false, 'message' => 'Некорректные данные']);
        exit();
    }

    $name = trim($data['name'] ?? '');
    $phone = trim($data['phone'] ?? '');
    $email = trim($data['email'] ?? '');
    $service = trim($data['service'] ?? '');
    $address = trim($data['address'] ?? '');
    $description = trim($data['description'] ?? '');

    $errors = [];
    if (empty($name)) $errors[] = 'Имя обязательно';
    if (empty($phone)) $errors[] = 'Телефон обязателен';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Некорректный email';
    if (empty($service)) $errors[] = 'Выберите услугу';
    if (empty($address)) $errors[] = 'Адрес обязателен';

    if (!empty($errors)) {
        echo json_encode(['success' => false, 'message' => implode(', ', $errors)]);
        exit();
    }

    try {
        $userId = $_SESSION['user_id'] ?? null;
        
        $stmt = $db->prepare("INSERT INTO orders (user_id, customer_name, phone, email, service_type, address, description) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $name, $phone, $email, $service, $address, $description]);

        echo json_encode(['success' => true, 'message' => 'Заказ успешно отправлен!']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Ошибка сервера']);
    }
    exit();
}

// PUT - обновление заказа
if ($method === 'PUT') {
    session_start();
    $id = $_GET['id'] ?? null;
    
    if (!$id || !isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Ошибка']);
        exit();
    }

    $status = $data['status'] ?? null;
    if ($status) {
        $stmt = $db->prepare("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?");
        $stmt->execute([$status, $id, $_SESSION['user_id']]);
        echo json_encode(['success' => true, 'message' => 'Заказ обновлен']);
    }
    exit();
}

// DELETE - удаление заказа
if ($method === 'DELETE') {
    session_start();
    $id = $_GET['id'] ?? null;
    
    if (!$id || !isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Ошибка']);
        exit();
    }

    $stmt = $db->prepare("DELETE FROM orders WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $_SESSION['user_id']]);
    echo json_encode(['success' => true, 'message' => 'Заказ удален']);
    exit();
}
?>