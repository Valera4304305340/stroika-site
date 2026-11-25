import express from 'express';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database.js';
import { config } from '../config.js';
import { sendVerificationCode } from '../mailer.js'; // Импорт отправки почты

const router = express.Router();

// --- РЕГИСТРАЦИЯ С ОТПРАВКОЙ КОДА ---
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    if (!email || !password || !firstName) return res.status(400).json({ success: false, message: 'Заполните поля' });
    
    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(400).json({ success: false, message: 'Email уже используется' });

    const hash = await bcrypt.hash(password, config.security.bcryptRounds);
    const userId = uuidv4();
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Выводим код в консоль, чтобы вы могли его увидеть на Render в логах
    console.log(`[DEBUG] Код для ${email}: ${verificationCode}`);

    await dbRun(`INSERT INTO users (id, username, email, password_hash, full_name, phone, role, verification_code, is_verified) VALUES (?, ?, ?, ?, ?, ?, 'client', ?, 0)`,
      [userId, email.split('@')[0], email, hash, `${firstName} ${lastName}`, phone || null, verificationCode]);

    // Пытаемся отправить письмо, но даже если не уйдет, НЕ удаляем пользователя
    const emailSent = await sendVerificationCode(email, verificationCode);
    
    if (!emailSent) {
      console.log('Ошибка отправки письма, но пользователь создан. Код: ' + verificationCode);
    }

    await dbRun(`INSERT INTO audit_log (id, user_id, action, description) VALUES (?, ?, 'REGISTER', 'Новый пользователь ожидает подтверждения')`, [uuidv4(), userId]);
    
    // Всегда возвращаем успех!
    res.json({ success: true, message: 'Код отправлен! Если письмо не пришло, проверьте консоль сервера.' });
  } catch (e) { 
    console.error(e);
    res.status(500).json({ success: false, message: 'Ошибка сервера: ' + e.message }); 
  }
});

// --- ПРОВЕРКА КОДА ИЗ ПИСЬМА ---
router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    const user = await dbGet('SELECT * FROM users WHERE email = ? AND verification_code = ?', [email, code]);
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Неверный код или email' });
    }
    
    // Активируем аккаунт
    await dbRun('UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?', [user.id]);
    await dbRun(`INSERT INTO audit_log (id, user_id, action, description) VALUES (?, ?, 'VERIFY', 'Пользователь подтвердил email')`, [uuidv4(), user.id]);
    
    res.json({ success: true, message: 'Аккаунт успешно подтвержден! Теперь вы можете войти.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

// --- ВХОД С ПРОВЕРКОЙ ПОДТВЕРЖДЕНИЯ ---
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) return res.status(401).json({ success: false, message: 'Неверный email или пароль' });

    if (user.is_verified === 0) {
      return res.status(403).json({ success: false, message: 'Подтвердите email. Код отправлен на вашу почту.' });
    }

    if (user.is_locked === 1 && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({ success: false, message: 'Аккаунт заблокирован на 15 минут' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = user.failed_attempts + 1;
      const isLock = attempts >= 3 ? 1 : 0;
      const lockUntil = isLock ? new Date(Date.now() + 15*60*1000).toISOString() : null;
      await dbRun('UPDATE users SET failed_attempts = ?, is_locked = ?, locked_until = ? WHERE id = ?', [attempts, isLock, lockUntil, user.id]);
      return res.status(401).json({ success: false, message: isLock ? 'Аккаунт заблокирован' : 'Неверный пароль' });
    }

    await dbRun('UPDATE users SET failed_attempts = 0, is_locked = 0, locked_until = NULL WHERE id = ?', [user.id]);
    const token = uuidv4();
    const expires = new Date(Date.now() + config.session.maxAge).toISOString();
    await dbRun('INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)', [uuidv4(), user.id, token, expires]);

    res.json({ success: true, message: 'Вход выполнен', token, user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } });
  } catch (e) { 
    console.error(e);
    res.status(500).json({ success: false, message: 'Ошибка сервера' }); 
  }
});

router.post('/logout', async (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (token) await dbRun('UPDATE sessions SET is_active = 0 WHERE token = ?', [token]);
  res.json({ success: true, message: 'Выход выполнен' });
});

router.get('/me', async (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false });
  const session = await dbGet(`SELECT u.id, u.email, u.full_name, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.is_active = 1 AND s.expires_at > CURRENT_TIMESTAMP`, [token]);
  if (!session) return res.status(401).json({ success: false });
  res.json({ success: true, user: { id: session.id, email: session.email, fullName: session.full_name, role: session.role } });
});

router.get('/users', async (req, res) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    const session = await dbGet(`SELECT u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.is_active = 1`, [token]);
    if (!session || session.role !== 'admin') return res.status(403).json({ success: false });

    const users = await dbAll('SELECT id, full_name, email, role, is_locked FROM users');
    res.json({ success: true, users });
});

router.get('/logs', async (req, res) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    const session = await dbGet(`SELECT u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.is_active = 1`, [token]);
    if (!session || session.role !== 'admin') return res.status(403).json({ success: false });

    const logs = await dbAll('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 50');
    res.json({ success: true, logs });
});
// --- УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ (Только для админа) ---
router.delete('/users/:id', async (req, res) => {
    try {
        const token = req.headers['authorization']?.replace('Bearer ', '');
        const session = await dbGet(`SELECT u.role, u.id as admin_id FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.is_active = 1`, [token]);
        
        if (!session || session.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Доступ только для администратора' });
        }

        const userIdToDelete = req.params.id;

        // Запрещаем админу удалять самого себя
        if (userIdToDelete === session.admin_id) {
            return res.status(400).json({ success: false, message: 'Вы не можете удалить свой аккаунт' });
        }

        // Удаляем пользователя (связанные данные, такие как сессии, удалятся каскадно, если настроено, или удалим вручную)
        await dbRun('DELETE FROM sessions WHERE user_id = ?', [userIdToDelete]);
        await dbRun('DELETE FROM users WHERE id = ?', [userIdToDelete]);

        // Логируем действие
        await dbRun(`INSERT INTO audit_log (id, user_id, action, description) VALUES (?, ?, 'DELETE_USER', 'Администратор удалил пользователя')`, 
            [uuidv4(), session.admin_id]);

        res.json({ success: true, message: 'Пользователь удален' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});
export default router;