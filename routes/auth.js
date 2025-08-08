const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

// 簡單的用戶驗證（實際應用中應該使用數據庫）
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // password
  },
  {
    id: 2,
    username: 'albouwu@gmail.com',
    password: '$2a$10$yfGOj4gqHrGb9EydTl5/ee/JMUHtIuXkUeEtFSmuzWdxHnFGZnt2K' // FI@600828
  },
  {
    id: 3,
    username: 'albuwu@gmail.com',
    password: '$2a$10$yfGOj4gqHrGb9EydTl5/ee/JMUHtIuXkUeEtFSmuzWdxHnFGZnt2K' // FI@600828 (常見拼寫別名)
  },
  {
    id: 4,
    username: 'albowu@gmail.com',
    password: '$2a$10$yfGOj4gqHrGb9EydTl5/ee/JMUHtIuXkUeEtFSmuzWdxHnFGZnt2K' // FI@600828 (常見拼寫別名)
  }
];

// 登入
router.post('/login', async (req, res) => {
  try {
    const rawUsername = typeof req.body?.username === 'string' ? req.body.username : '';
    const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';

    const username = rawUsername.trim();
    const password = rawPassword.trim();

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    console.log('[AUTH] Login attempt:', { username });

    // 查找用戶（忽略大小寫並去除空白）
    const normalized = username.toLowerCase();
    const user = users.find(u => (u.username || '').toLowerCase() === normalized);

    if (!user) {
      console.warn('[AUTH] User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 驗證密碼
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.warn('[AUTH] Password mismatch for:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 生成 JWT token（提供開發環境預設密鑰以避免未設定導致 500）
    const jwtSecret = process.env.JWT_SECRET || 'dev_insecure_secret_change_me';
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 驗證 token 中間件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  const jwtSecret = process.env.JWT_SECRET || 'dev_insecure_secret_change_me';
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// 驗證當前 token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = { router, authenticateToken };