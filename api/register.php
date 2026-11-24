<?php
require_once __DIR__ . '/db.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Некорректные данные']);
    exit();
}

$firstName = trim($data['firstName'] ?? '');
$lastName = trim($data['lastName'] ?? '');
$email = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? '');
$password = $data['password'] ?? '';

$errors = [];
if (empty($firstName)) $errors[] = 'Имя обязательно';
if (empty($lastName)) $errors[] = 'Фамилия обязательна';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'Некорректный email';
if (strlen($password) < PASSWORD_MIN_LENGTH) $errors[] = 'Пароль должен быть не менее ' . PASSWORD_MIN_LENGTH . ' символов';

if (!empty($errors)) {
    echo json_encode(['success' => false, 'message' => implode(', ', $errors)]);
    exit();
}

$db = Database::getInstance()->getConnection();

try {
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Пользователь с таким email уже существует']);
        exit();
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    $stmt = $db->prepare("INSERT INTO users (first_name, last_name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$firstName, $lastName, $email, $phone, $passwordHash]);

    echo json_encode(['success' => true, 'message' => 'Регистрация успешна!']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Ошибка сервера']);
}
?>