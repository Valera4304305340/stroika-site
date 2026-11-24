import { dbGet } from '../database.js';
import { logSecurityEvent } from '../utils/security.js';

// Authentication middleware
export const requireAuth = async (req, res, next) => {
  try {
    // Check if user is authenticated via session
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    // Verify session is still valid
    const session = await dbGet(
      'SELECT * FROM sessions WHERE user_id = ? AND is_active = 1 AND expires_at > datetime("now")',
      [req.session.userId]
    );
    
    if (!session) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        error: 'Session expired or invalid'
      });
    }
    
    // Check if user exists and is not locked
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
};

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Log security error
  if (req.session && req.session.userId) {
    logSecurityEvent(req.session.userId, 'ERROR', err.message, req.ip).catch(console.error);
  }
  
  return res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
};

// CORS middleware
export const corsMiddleware = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
};

export default {
  requireAuth,
  errorHandler,
  corsMiddleware,
  requestLogger
};
