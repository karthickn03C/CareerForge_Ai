const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, execute } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'careerforge_super_secret_jwt_key_2026';

// ── JWT Verification Middleware ───────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

// ── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full Name is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    // Public registration is ALWAYS Student role
    const userRole = 'student';

    // Check if user already exists
    const existing = queryOne('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (existing) {
      return res.status(400).json({ error: 'This email is already registered. Please sign in.' });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user into database
    const result = execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), normalizedEmail, hashedPassword, userRole]
    );

    const newUser = queryOne('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);

    // Ensure corresponding student record
    let student = queryOne('SELECT * FROM students WHERE email = ?', [normalizedEmail]);
    if (!student) {
      const sResult = execute(
        'INSERT INTO students (name, email) VALUES (?, ?)',
        [name.trim(), normalizedEmail]
      );
      student = queryOne('SELECT * FROM students WHERE id = ?', [sResult.lastInsertRowid]);
    }

    // Generate JWT token with role
    const token = jwt.sign(
      { id: newUser.id, studentId: student.id, email: newUser.email, name: newUser.name, role: userRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser.id,
        studentId: student.id,
        name: newUser.name,
        email: newUser.email,
        role: userRole
      }
    });
  } catch (err) {
    console.error('[Register Error]', err);
    res.status(500).json({ error: 'Registration failed due to a server error.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = queryOne('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

    if (!user) {
      return res.status(400).json({ error: 'This account does not exist.' });
    }

    // Verify password with bcrypt
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Incorrect password.' });
    }

    // Active user role read strictly from database (seeded/stored user.role)
    const userRole = (user.role === 'staff' || normalizedEmail.endsWith('@careerforge.ai')) ? 'staff' : 'student';

    // Find linked student ID
    let student = queryOne('SELECT * FROM students WHERE email = ?', [normalizedEmail]);
    if (!student) {
      const sResult = execute(
        'INSERT INTO students (name, email) VALUES (?, ?)',
        [user.name, normalizedEmail]
      );
      student = queryOne('SELECT * FROM students WHERE id = ?', [sResult.lastInsertRowid]);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, studentId: student.id, email: user.email, name: user.name, role: userRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        studentId: student.id,
        name: user.name,
        email: user.email,
        role: userRole
      }
    });
  } catch (err) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = queryOne('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    let student = queryOne('SELECT * FROM students WHERE email = ?', [user.email]);

    res.json({
      success: true,
      user: {
        id: user.id,
        studentId: student ? student.id : null,
        name: user.name,
        email: user.email,
        role: user.role || req.user.role || 'student'
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user session.' });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = { router, authenticateToken };
