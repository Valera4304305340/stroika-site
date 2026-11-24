<?php
require_once __DIR__ . '/db.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Некорректные данные']);
    exit();
}

$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'message' => 'Заполните все поля']);
    exit();
}

$db = Database::getInstance()->getConnection();

try {
    $stmt = $db->prepare("SELECT id, first_name, last_name, email, password_hash, failed_attempts, locked_until FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Неверный email или пароль']);
        exit();
    }

    $now = new DateTime();
    $lockedUntil = $user['locked_until'] ? new DateTime($user['locked_until']) : null;

    if ($lockedUntil && $now < $lockedUntil) {
        $remaining = $now->diff($lockedUntil);
        $minutes = $remaining->i;
        echo json_encode([
            'success' => false, 
            'message' => "Аккаунт заблокирован. Попробуйте через {$minutes} минут"
        ]);
        exit();
    }

    if (password_verify($password, $user['password_hash'])) {
        $stmt = $db->prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?");
        $stmt->execute([$user['id']]);

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
        $_SESSION['user_email'] = $user['email'];

        echo json_encode([
            'success' => true,
            'message' => 'Вход выполнен успешно',
            'user' => [
                'id' => $user['id'],
                'full_name' => $user['first_name'] . ' ' . $user['last_name'],
                'email' => $user['email']
            ]
        ]);
    } else {
        $failed = $user['failed_attempts'] + 1;
        
        if ($failed >= MAX_LOGIN_ATTEMPTS) {
            $blockUntil = (new DateTime())->modify('+' . LOCK_TIME_MINUTES . ' minutes');
            $stmt = $db->prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?");
            $stmt->execute([$failed, $blockUntil->format('Y-m-d H:i:s'), $user['id']]);
            
            echo json_encode([
                'success' => false, 
                'message' => "Аккаунт заблокирован на " . LOCK_TIME_MINUTES . " минут"
            ]);
        } else {
            $stmt = $db->prepare("UPDATE users SET failed_attempts = ? WHERE id = ?");
            $stmt->execute([$failed, $user['id']]);
            
            echo json_encode([
                'success' => false, 
                'message' => "Неверный пароль. Осталось попыток: " . (MAX_LOGIN_ATTEMPTS - $failed)
            ]);
        }
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Ошибка сервера']);
}
?>