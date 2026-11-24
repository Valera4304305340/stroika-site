import validator from 'validator';
import { config } from '../config.js';

// Validate email format
export const validateEmail = (email) => {
  if (!email || !validator.isEmail(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true };
};

// Validate password strength
export const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { valid: false, errors };
  }
  
  if (password.length < config.security.passwordMinLength) {
    errors.push(`Password must be at least ${config.security.passwordMinLength} characters long`);
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
};

// Validate username
export const validateUsername = (username) => {
  const errors = [];
  
  if (!username) {
    errors.push('Username is required');
    return { valid: false, errors };
  }
  
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters long');
  }
  
  if (username.length > 20) {
    errors.push('Username must not exceed 20 characters');
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, hyphens, and underscores');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
};

// Validate phone number
export const validatePhone = (phone) => {
  // Allow empty phone, but if provided, validate format
  if (!phone) {
    return { valid: true };
  }
  
  if (!validator.isMobilePhone(phone, 'any')) {
    return { valid: false, error: 'Invalid phone number format' };
  }
  
  return { valid: true };
};

// Validate full name
export const validateFullName = (fullName) => {
  if (!fullName) {
    return { valid: false, error: 'Full name is required' };
  }
  
  if (fullName.length < 2) {
    return { valid: false, error: 'Full name must be at least 2 characters long' };
  }
  
  if (fullName.length > 100) {
    return { valid: false, error: 'Full name must not exceed 100 characters' };
  }
  
  if (!/^[a-zA-Zа-яА-ЯёЁ\s'-]+$/.test(fullName)) {
    return { valid: false, error: 'Full name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { valid: true };
};

// Validate order data
export const validateOrderData = (orderData) => {
  const errors = [];
  
  if (!orderData.product_name || orderData.product_name.trim() === '') {
    errors.push('Product name is required');
  } else if (orderData.product_name.length > 200) {
    errors.push('Product name must not exceed 200 characters');
  }
  
  if (!orderData.quantity || orderData.quantity < 1) {
    errors.push('Quantity must be at least 1');
  } else if (!Number.isInteger(orderData.quantity)) {
    errors.push('Quantity must be an integer');
  }
  
  if (!orderData.price || orderData.price < 0) {
    errors.push('Price must be a positive number');
  } else if (!validator.isDecimal(orderData.price.toString())) {
    errors.push('Price must be a valid decimal number');
  }
  
  if (orderData.description && orderData.description.length > 1000) {
    errors.push('Description must not exceed 1000 characters');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return validator.trim(input)
    .replace(/[<>]/g, '')
    .substring(0, 1000);
};

// Validate registration data
export const validateRegistrationData = (data) => {
  const errors = [];
  
  // Validate username
  const usernameValidation = validateUsername(data.username);
  if (!usernameValidation.valid) {
    errors.push(...usernameValidation.errors);
  }
  
  // Validate email
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.push(emailValidation.error);
  }
  
  // Validate password
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.push(...passwordValidation.errors);
  }
  
  // Validate password confirmation
  if (data.password !== data.password_confirm) {
    errors.push('Passwords do not match');
  }
  
  // Validate full name
  const fullNameValidation = validateFullName(data.full_name);
  if (!fullNameValidation.valid) {
    errors.push(fullNameValidation.error);
  }
  
  // Validate phone if provided
  if (data.phone) {
    const phoneValidation = validatePhone(data.phone);
    if (!phoneValidation.valid) {
      errors.push(phoneValidation.error);
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
};

// Validate login data
export const validateLoginData = (data) => {
  const errors = [];
  
  if (!data.username || data.username.trim() === '') {
    errors.push('Username is required');
  }
  
  if (!data.password || data.password === '') {
    errors.push('Password is required');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  return { valid: true };
};

export default {
  validateEmail,
  validatePassword,
  validateUsername,
  validatePhone,
  validateFullName,
  validateOrderData,
  sanitizeInput,
  validateRegistrationData,
  validateLoginData
};
