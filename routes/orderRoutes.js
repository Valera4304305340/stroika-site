import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../database.js';

const router = express.Router();

async function getUser(req) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return null;
  return await dbGet(`SELECT u.id, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.is_active = 1 AND s.expires_at > CURRENT_TIMESTAMP`, [token]);
}

router.post('/', async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Требуется авторизация' });

    const { service_id, quantity, address, description } = req.body;
    if (!service_id || !address) return res.status(400).json({ success: false, message: 'Заполните поля' });

    const service = await dbGet('SELECT * FROM services WHERE id = ?', [service_id]);
    if (!service) return res.status(404).json({ success: false, message: 'Услуга не найдена' });

    const total = service.price * (quantity || 1);
    const orderId = uuidv4();
    await dbRun(`INSERT INTO orders (id, user_id, service_id, quantity, total_price, address, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [orderId, user.id, service_id, quantity || 1, total, address, description || null]);
    await dbRun(`INSERT INTO order_status_history (id, order_id, status, changed_by) VALUES (?, ?, 'pending', ?)`, [uuidv4(), orderId, user.id]);
    
    res.status(201).json({ success: true, message: 'Заказ создан', orderId });
  } catch (e) { res.status(500).json({ success: false, message: 'Ошибка сервера' }); }
});

router.get('/my', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ success: false });
  const orders = await dbAll(`SELECT o.*, s.name as service_name FROM orders o JOIN services s ON o.service_id = s.id WHERE o.user_id = ? ORDER BY o.created_at DESC`, [user.id]);
  res.json({ success: true, orders });
});
router.get('/all', async (req, res) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    const session = await dbGet(`SELECT u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.is_active = 1`, [token]);
    if (!session || session.role !== 'admin') return res.status(403).json({ success: false });

    const orders = await dbAll(`
        SELECT o.*, s.name as service_name, u.full_name as client_name 
        FROM orders o 
        JOIN services s ON o.service_id = s.id 
        JOIN users u ON o.user_id = u.id 
        ORDER BY o.created_at DESC
    `);
    res.json({ success: true, orders });
});

router.patch('/:id/status', async (req, res) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    const session = await dbGet(`SELECT u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.is_active = 1`, [token]);
    if (!session || session.role !== 'admin') return res.status(403).json({ success: false });

    const { status } = req.body;
    await dbRun('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    await dbRun(`INSERT INTO order_status_history (id, order_id, status, changed_by) VALUES (?, ?, ?, ?)`, [uuidv4(), req.params.id, status, session.user_id]);
    
    res.json({ success: true });
});
export default router;