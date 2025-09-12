import bcrypt from 'bcryptjs';
import db from '../db/database.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await db('users').where({ email }).first();
    if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials.' });

    // Accept any known column name
    const hash =
      (typeof user.password === 'string' && user.password) ||
      (typeof user.password_hash === 'string' && user.password_hash) ||
      (typeof user.hashed_password === 'string' && user.hashed_password) ||
      (typeof user.pass === 'string' && user.pass) ||
      null;

    if (!hash) {
      console.error('AUTH: user has no stored password hash', {
        id: user.id,
        has_password: !!user.password,
        has_password_hash: !!user.password_hash,
        has_hashed_password: !!user.hashed_password,
        has_pass: !!user.pass,
      });
      return res.status(500).json({ success: false, message: 'Account has no password set.' });
    }

    const ok = await bcrypt.compare(password, hash); // (plain, hash)
    if (!ok) return res.status(400).json({ success: false, message: 'Invalid credentials.' });

    return res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed.' });
  }
};
