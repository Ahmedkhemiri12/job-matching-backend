import bcrypt from 'bcryptjs';
import db from '../db/database.js'; // adjust if your db file lives elsewhere

export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await db('users').where({ email }).first();
    if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials.' });

    // Accept whichever column exists
    const hash =
      (typeof user.password === 'string' && user.password) ||
      (typeof user.password_hash === 'string' && user.password_hash) ||
      (typeof user.hashed_password === 'string' && user.hashed_password) ||
      null;

    if (!hash) {
      console.error('AUTH: user has no stored password hash', {
        id: user.id,
        has_password: !!user.password,
        has_password_hash: !!user.password_hash
      });
      return res.status(500).json({ success: false, message: 'Account has no password set.' });
    }

    const ok = await bcrypt.compare(password, hash); // (plain, hash)
    if (!ok) return res.status(400).json({ success: false, message: 'Invalid credentials.' });

    // Return whatever payload you need (no JWT here to keep your code unchanged)
    return res.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed.' });
  }
};
