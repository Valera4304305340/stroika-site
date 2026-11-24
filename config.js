import dotenv from 'dotenv';
dotenv.config();

export const config = {
  server: {
    port: process.env.PORT || 3000
  },
  session: {
    secret: process.env.SESSION_SECRET || 'super-secret-key',
    maxAge: 3600000 // 1 час
  },
  security: {
    maxLoginAttempts: 3,
    lockTime: 15 * 60 * 1000, // 15 минут
    passwordMinLength: 6,
    bcryptRounds: 10
  },
  database: {
    path: './database.db' // Файл базы создастся в этой же папке
  }
};