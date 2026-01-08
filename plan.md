# Expense Splitter Backend - Node.js Express + JWT

## Project Structure

```
expense-splitter-backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── jwt.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── validation.js
│   ├── models/
│   │   ├── user.js
│   │   ├── group.js
│   │   ├── expense.js
│   │   └── settlement.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── groups.js
│   │   ├── expenses.js
│   │   └── balances.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── groupController.js
│   │   ├── expenseController.js
│   │   └── balanceController.js
│   ├── utils/
│   │   ├── generateCode.js
│   │   └── calculateBalances.js
│   └── app.js
├── .env
├── .gitignore
├── package.json
└── server.js
```

## Dependencies (package.json)

```json
{
  "name": "expense-splitter-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "express-validator": "^7.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

## Environment Variables (.env)

```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/expense_splitter
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
NODE_ENV=development
```

## Core Files

### 1. server.js

```javascript
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2. src/app.js

```javascript
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const groupRoutes = require('./routes/groups');
const expenseRoutes = require('./routes/expenses');
const balanceRoutes = require('./routes/balances');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/balances', balanceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
```

### 3. src/config/database.js

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

module.exports = pool;
```

### 4. src/config/jwt.js

```javascript
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };
```

### 5. src/middleware/auth.js

```javascript
const { verifyToken } = require('../config/jwt');
const pool = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if user exists
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = { authenticate };
```

### 6. src/middleware/errorHandler.js

```javascript
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details
    });
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      error: 'Resource already exists'
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
};

module.exports = errorHandler;
```

### 7. src/utils/generateCode.js

```javascript
const generateInvitationCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

module.exports = { generateInvitationCode };
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Groups
- `POST /api/groups` - Create group (authenticated)
- `POST /api/groups/join` - Join group by code (authenticated)
- `GET /api/groups` - Get user's groups (authenticated)
- `GET /api/groups/:id` - Get group details (authenticated)
- `GET /api/groups/:id/members` - Get group members (authenticated)

### Expenses
- `POST /api/groups/:groupId/expenses` - Add expense (authenticated)
- `GET /api/groups/:groupId/expenses` - Get group expenses (authenticated)
- `GET /api/expenses/:id` - Get expense details (authenticated)

### Balances
- `GET /api/groups/:groupId/balances` - Get group balances (authenticated)
- `POST /api/groups/:groupId/settlements` - Record settlement (authenticated)
- `GET /api/groups/:groupId/settlements` - Get settlement history (authenticated)

## Sample Controller: authController.js

```javascript
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { generateToken } = require('../config/jwt');

// Register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email.toLowerCase(), hashedPassword]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User created successfully',
      user,
      token
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    next(error);
  }
};

// Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (error) {
    next(error);
  }
};
```

## Sample Route: auth.js

```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
```

## Installation Steps

1. Initialize project:
```bash
npm init -y
```

2. Install dependencies:
```bash
npm install express pg bcryptjs jsonwebtoken dotenv cors express-validator
npm install --save-dev nodemon
```

3. Create .env file with your configuration

4. Run database schema (from previous artifact)

5. Start server:
```bash
npm run dev
```

## Next Steps

1. Implement remaining controllers (groups, expenses, balances)
2. Add input validation middleware
3. Add rate limiting
4. Add request logging
5. Write API tests
6. Deploy to production

Would you like me to create the complete controllers for groups, expenses, and balances?