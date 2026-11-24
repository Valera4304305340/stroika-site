import bcryptjs from 'bcryptjs';
import { config } from '../config.js';
import { dbGet, dbRun } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

// Password hashing
export const hashPassword = async (password) => {
  try {
    const salt = await bcryptjs.genSalt(config.security.bcryptRounds);
    return await bcryptjs.hash(password, salt);
  } catch (err) {
    throw new Error('Error hashing password');
  }
};

// Password comparison
export const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    return await bcryptjs.compare(plainPassword, hashedPassword);
  } catch (err) {
    throw new Error('Error comparing passwords');
  }
};

// Generate session token
export const generateToken = () => {
  return uuidv4();
};

// Check if account is locked (Brute Force protection)
export const isAccountLocked = async (userId) => {
  try {
    const user = await dbGet('SELECT is_locked, locked_until FROM users WHERE id = ?', [userId]);
    
    if (!user) return false;
    
    if (user.is_locked) {
      const lockedUntil = new Date(user.locked_until);
      const now = new Date();
      
      // If lock time has passed, unlock the account
      if (now > lockedUntil) {
        await unlockAccount(userId);
        return false;
      }
      
      return true;
    }
    
    return false;
  } catch (err) {
    console.error('Error checking account lock status:', err);
    return false;
  }
};

// Record failed login attempt
export const recordFailedAttempt = async (userId) => {
  try {
    const user = await dbGet('SELECT failed_attempts FROM users WHERE id = ?', [userId]);
    
    if (!user) throw new Error('User not found');
    
    const newAttemptCount = (user.failed_attempts || 0) + 1;
    const now = new Date().toISOString();
    
    // Lock account after MAX_LOGIN_ATTEMPTS
    if (newAttemptCount >= config.security.maxLoginAttempts) {
      const lockedUntil = new Date(Date.now() + config.security.lockTime).toISOString();
      
      await dbRun(
        `UPDATE users SET 
          failed_attempts = ?, 
          last_failed_attempt = ?,
          is_locked = 1,
          locked_until = ?
        WHERE id = ?`,
        [newAttemptCount, now, lockedUntil, userId]
      );
      
      // Log security event
      await logSecurityEvent(userId, 'ACCOUNT_LOCKED', `Account locked after ${newAttemptCount} failed attempts`);
      
      return { locked: true, attempts: newAttemptCount };
    } else {
      await dbRun(
        `UPDATE users SET 
          failed_attempts = ?, 
          last_failed_attempt = ?
        WHERE id = ?`,
        [newAttemptCount, now, userId]
      );
      
      return { locked: false, attempts: newAttemptCount, remaining: config.security.maxLoginAttempts - newAttemptCount };
    }
  } catch (err) {
    console.error('Error recording failed attempt:', err);
    throw err;
  }
};

// Reset failed attempts on successful login
export const resetFailedAttempts = async (userId) => {
  try {
    await dbRun(
      `UPDATE users SET 
        failed_attempts = 0, 
        last_failed_attempt = NULL,
        is_locked = 0,
        locked_until = NULL
      WHERE id = ?`,
      [userId]
    );
  } catch (err) {
    console.error('Error resetting failed attempts:', err);
    throw err;
  }
};

// Unlock account manually
export const unlockAccount = async (userId) => {
  try {
    await dbRun(
      `UPDATE users SET 
        is_locked = 0, 
        locked_until = NULL,
        failed_attempts = 0,
        last_failed_attempt = NULL
      WHERE id = ?`,
      [userId]
    );
    
    await logSecurityEvent(userId, 'ACCOUNT_UNLOCKED', 'Account automatically unlocked after lock time expired');
  } catch (err) {
    console.error('Error unlocking account:', err);
    throw err;
  }
};

// Log security events
export const logSecurityEvent = async (userId, action, description, ipAddress = null) => {
  try {
    const auditId = uuidv4();
    await dbRun(
      `INSERT INTO audit_log (id, user_id, action, description, ip_address) 
       VALUES (?, ?, ?, ?, ?)`,
      [auditId, userId, action, description, ipAddress]
    );
  } catch (err) {
    console.error('Error logging security event:', err);
  }
};

export default {
  hashPassword,
  comparePassword,
  generateToken,
  isAccountLocked,
  recordFailedAttempt,
  resetFailedAttempts,
  unlockAccount,
  logSecurityEvent
};
