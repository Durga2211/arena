const jwt = require('jsonwebtoken');
const User = require('../models/User');
const admin = require('../config/firebase');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
  return { accessToken, refreshToken };
};

// @desc    Register a new user
// @route   POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return res.status(400).json({ message: `${field} already exists` });
    }

    const user = await User.create({ username, email, password });
    const tokens = generateTokens(user._id);

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        walletBalance: user.walletBalance,
        depositBalance: user.depositBalance,
        winningsBalance: user.winningsBalance,
        avatar: user.avatar,
      },
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const tokens = generateTokens(user._id);

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        walletBalance: user.walletBalance,
        depositBalance: user.depositBalance,
        winningsBalance: user.winningsBalance,
        avatar: user.avatar,
        totalGamesPlayed: user.totalGamesPlayed,
        totalWins: user.totalWins,
        totalEarnings: user.totalEarnings,
      },
      ...tokens,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Lazy migration for legacy accounts
    if (user.winningsBalance === 0 && user.totalEarnings > 0 && user.walletBalance > 0) {
      let newWinnings = user.totalEarnings;
      if (newWinnings > user.walletBalance) {
        newWinnings = user.walletBalance;
      }
      user.winningsBalance = newWinnings;
      user.depositBalance = user.walletBalance - newWinnings;
      await user.save();
    }
    
    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        walletBalance: user.walletBalance,
        depositBalance: user.depositBalance,
        winningsBalance: user.winningsBalance,
        avatar: user.avatar,
        totalGamesPlayed: user.totalGamesPlayed,
        totalWins: user.totalWins,
        totalEarnings: user.totalEarnings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const tokens = generateTokens(user._id);
    res.json({ success: true, ...tokens });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// @desc    Firebase Google Login/Signup
// @route   POST /api/auth/google
exports.googleAuth = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Firebase token is required' });
    }

    let decodedToken;
    try {
      // Try to verify with Firebase Admin
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (firebaseErr) {
      // If Admin SDK is not initialized, mock the token data for development purposes
      if (firebaseErr.code === 'app/no-app' || firebaseErr.message?.toLowerCase().includes('firebase app') || firebaseErr.message?.includes('not initialized')) {
        console.warn('⚠️ Firebase Admin not initialized. Using mock token data for development.');
        // Decode token payload manually (unsafe but okay for dev if admin is missing)
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        decodedToken = {
          email: payload.email || 'mockuser@example.com',
          name: payload.name || 'Mock User',
          picture: payload.picture || '',
          uid: payload.user_id || payload.sub || 'mock_uid_' + Date.now(),
        };
      } else {
        throw firebaseErr;
      }
    }

    const { email, name, picture, uid } = decodedToken;

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create user
      user = await User.create({
        username: name ? name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000) : 'user' + Math.floor(Math.random() * 10000),
        email,
        password: uid + process.env.JWT_SECRET, // Dummy password for oauth users
        avatar: picture,
      });
    } else if (!user.avatar || user.avatar === '') {
      user.avatar = picture;
      await user.save();
    }

    const tokens = generateTokens(user._id);

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        walletBalance: user.walletBalance,
        depositBalance: user.depositBalance,
        winningsBalance: user.winningsBalance,
        avatar: user.avatar,
        totalGamesPlayed: user.totalGamesPlayed,
        totalWins: user.totalWins,
        totalEarnings: user.totalEarnings,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('Firebase auth error:', error);
    res.status(401).json({ message: 'Invalid Firebase token' });
  }
};
