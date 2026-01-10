const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
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

    // Insert user with Prisma
    const user = await prisma.users.create({
      data: {
        name,
        email: email.toLowerCase(),
        password_hash: hashedPassword
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User created successfully',
      user,
      token
    });
  } catch (error) {
    if (error.code === 'P2002') {
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

    // Find user with Prisma
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        password_hash: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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
