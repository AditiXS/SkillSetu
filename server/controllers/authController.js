const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendMail, templates } = require('../utils/mailer');
const { Op } = require('sequelize');
const { User, Wallet, Certificate, Achievement } = require('../models');
require('dotenv').config();
const admin = require('../config/firebaseAdmin');

// Register
exports.firebaseLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'No token provided' });

    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture } = decodedToken;

    // Check if user exists
    let user = await User.findOne({ where: { email } });
    
    if (!user) {
      // Auto-register new user from Google
      // Generate random password since they login with Google
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 12);
      
      user = await User.create({
        fullName: name || 'Google User',
        email,
        password: hashedPassword,
        profilePicture: picture || null,
        isVerified: true // Auto-verify Google users
      });
      
      // Give starter credits
      await Wallet.create({ userId: user.id, balance: 150 });
      
      // Welcome email
      const welcome = templates.welcome(user.fullName);
      sendMail({ to: user.email, ...welcome });
    }

    // Generate JWT (matching existing system)
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const wallet = await Wallet.findOne({ where: { userId: user.id } });

    res.status(200).json({
      message: 'Google login successful!',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        credits: user.credits,
        role: user.role,
        skillsOffered: user.skillsOffered,
        skillsWanted: user.skillsWanted,
        bio: user.bio,
        profilePicture: user.profilePicture,
        walletBalance: wallet ? wallet.balance : 0,
      },
    });
  } catch (err) {
    console.error('Firebase login error:', err);
    res.status(500).json({ message: 'Authentication failed. Please try again.' });
  }
};

// Register
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, skillsOffered, skillsWanted } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      skillsOffered: skillsOffered || '',
      skillsWanted: skillsWanted || '',
    });

    // Create wallet with starter credits
    await Wallet.create({ userId: user.id, balance: 150 });

    // Send welcome email (non-blocking)
    const welcome = templates.welcome(user.fullName);
    sendMail({ to: user.email, ...welcome });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        credits: user.credits,
        role: user.role,
        skillsOffered: user.skillsOffered,
        skillsWanted: user.skillsWanted,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // Get wallet balance
    const wallet = await Wallet.findOne({ where: { userId: user.id } });

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        credits: user.credits,
        role: user.role,
        skillsOffered: user.skillsOffered,
        skillsWanted: user.skillsWanted,
        bio: user.bio,
        walletBalance: wallet ? wallet.balance : 0,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// Get current user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Certificate, as: 'certificates' },
        { model: Achievement, as: 'achievements' },
        { model: Wallet, as: 'wallet' },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, bio, skillsOffered, skillsWanted, mobileNumber, githubLink, portfolioLink } = req.body;

    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (fullName) user.fullName = fullName;
    if (bio !== undefined) user.bio = bio;
    if (skillsOffered !== undefined) user.skillsOffered = skillsOffered;
    if (skillsWanted !== undefined) user.skillsWanted = skillsWanted;
    if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
    if (githubLink !== undefined) user.githubLink = githubLink;
    if (portfolioLink !== undefined) user.portfolioLink = portfolioLink;

    await user.save();

    res.status(200).json({
      message: 'Profile updated!',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        credits: user.credits,
        role: user.role,
        skillsOffered: user.skillsOffered,
        skillsWanted: user.skillsWanted,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(200).json({ message: 'If an account exists, a reset link was sent.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const baseUrl = process.env.FRONTEND_URL.trim().replace(/\/$/, '');
    const resetUrl = `${baseUrl}/auth?reset=${resetToken}`;
    const resetEmail = templates.passwordReset(resetUrl);
    await sendMail({ to: user.email, ...resetEmail });

    res.status(200).json({ message: 'Password reset link sent to email!' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Error sending reset email.' });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: Date.now() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ message: 'Password has been successfully updated.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Error resetting password.' });
  }
};
