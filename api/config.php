<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================================
// НАСТРОЙКА ДЛЯ SPACEWEB
// ============================================

// Имя базы данных
define('DB_NAME', 'poltavtzev');

// Пользователь базы данных
define('DB_USER', 'poltavtzev');

// ⚠️ ВАЖНО: ВСТАВЬТЕ СВОЙ ПАРОЛЬ ОТ БД
define('DB_PASS', 'poltava3P*');

// Хост базы данных (из панели SpaceWeb)
define('DB_HOST', 'localhost');

// Порт MySQL (стандартный)
define('DB_PORT', 3306);

// ============================================
// НАСТРОЙКИ БЕЗОПАСНОСТИ
// ============================================
define('MAX_LOGIN_ATTEMPTS', 3);
define('LOCK_TIME_MINUTES', 15);
define('PASSWORD_MIN_LENGTH', 6);

session_start();
?>