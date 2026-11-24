import sqlite3 from 'sqlite3';
import { config } from './config.js';
import bcrypt from 'bcrypt'; // Добавили импорт bcrypt

const db = new sqlite3.Database(config.database.path, (err) => {
  if (err) console.error('DB connection error:', err);
  else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

export const dbRun = (sql, params = []) => new Promise((res, rej) => {
  db.run(sql, params, function(err) { if (err) rej(err); else res(this); });
});
export const dbGet = (sql, params = []) => new Promise((res, rej) => {
  db.get(sql, params, (err, row) => { if (err) rej(err); else res(row); });
});
export const dbAll = (sql, params = []) => new Promise((res, rej) => {
  db.all(sql, params, (err, rows) => { if (err) rej(err); else res(rows); });
});

async function initializeDatabase() {
  try {
    await dbRun(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, full_name TEXT, phone TEXT, role TEXT DEFAULT 'client',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_locked BOOLEAN DEFAULT 0, locked_until DATETIME, failed_attempts INTEGER DEFAULT 0, last_failed_attempt DATETIME,
      verification_code TEXT, is_verified BOOLEAN DEFAULT 0
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, expires_at DATETIME NOT NULL,
      ip_address TEXT, user_agent TEXT, is_active BOOLEAN DEFAULT 1, FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, price REAL NOT NULL, unit TEXT DEFAULT 'м²', is_active BOOLEAN DEFAULT 1
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, service_id TEXT NOT NULL, quantity INTEGER NOT NULL,
      total_price REAL NOT NULL, address TEXT, description TEXT, status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (service_id) REFERENCES services(id)
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS order_status_history (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL, status TEXT NOT NULL, changed_by TEXT NOT NULL,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (order_id) REFERENCES orders(id)
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, description TEXT, ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Создаем тестовые услуги
    const count = await dbGet(`SELECT COUNT(*) as count FROM services`);
    if (count.count === 0) {
      await dbRun(`INSERT INTO services (id, name, price, unit) VALUES ('srv_house', 'Строительство дома', 35000, 'м²')`);
      await dbRun(`INSERT INTO services (id, name, price, unit) VALUES ('srv_apartment', 'Ремонт квартиры', 8500, 'м²')`);
      await dbRun(`INSERT INTO services (id, name, price, unit) VALUES ('srv_facade', 'Фасадные работы', 1200, 'м²')`);
      await dbRun(`INSERT INTO services (id, name, price, unit) VALUES ('srv_callback', 'Обратный звонок', 0, 'шт')`);
      console.log('Services seeded');
    }

    // АВТО-СОЗДАНИЕ АДМИНА
    const adminExists = await dbGet(`SELECT * FROM users WHERE role = 'admin'`);
    if (!adminExists) {
      const hash = await bcrypt.hash('admin123', 10);
      await dbRun(`INSERT INTO users (id, username, email, password_hash, full_name, role, is_verified) 
                   VALUES ('admin-id-123', 'admin', 'poltavtzevs@yandex.ru', ?, 'Сергей Полтавцев', 'admin', 1)`, [hash]);
      console.log('Админ создан: poltavtzevs@yandex.ru / admin123');
    }

    console.log('Database tables initialized');
  } catch (err) { console.error('Init DB error:', err); }
}