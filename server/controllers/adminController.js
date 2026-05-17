const { Op } = require('sequelize');
const { User, Session, Transaction, Wallet, Skill, Achievement } = require('../models');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      include: [{ model: Wallet, as: 'wallet' }],
      order: [['createdAt', 'DESC']],
    });
    res.json({ users });
  } catch (error) {
    console.error('AdminGetUsers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllSessions = async (req, res) => {
  try {
    const sessions = await Session.findAll({
      include: [
        { model: User, as: 'mentor', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'learner', attributes: ['id', 'fullName', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ sessions });
  } catch (error) {
    console.error('AdminGetSessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalSessions = await Session.count();
    const completedSessions = await Session.count({ where: { status: 'completed' } });
    const activeSessions = await Session.count({ where: { status: 'active' } });
    const totalCreditsCirculating = await Wallet.sum('balance');
    const totalTransactions = await Transaction.count();

    res.json({
      analytics: { totalUsers, totalSessions, completedSessions, activeSessions, totalCreditsCirculating, totalTransactions },
    });
  } catch (error) {
    console.error('AdminAnalytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyUser = async (req, res) => {
  try {
    await User.update({ isVerified: true, role: 'mentor' }, { where: { id: req.params.id } });
    res.json({ message: 'User verified as mentor' });
  } catch (error) {
    console.error('VerifyUser error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  const sequelize = require('../config/database');
  const userId = req.params.id;
  try {
    // Temporarily disable FK checks, delete all related data, then re-enable
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.query(`DELETE FROM messages WHERE senderId = ${userId}`);
    await sequelize.query(`DELETE FROM ratings WHERE raterId = ${userId} OR ratedUserId = ${userId}`);
    await sequelize.query(`DELETE FROM messages WHERE sessionId IN (SELECT id FROM sessions WHERE mentorId = ${userId} OR learnerId = ${userId})`);
    await sequelize.query(`DELETE FROM sessions WHERE mentorId = ${userId} OR learnerId = ${userId}`);
    await sequelize.query(`DELETE FROM session_requests WHERE senderId = ${userId} OR receiverId = ${userId}`);
    await sequelize.query(`DELETE FROM comments WHERE userId = ${userId}`);
    await sequelize.query(`DELETE FROM community_posts WHERE userId = ${userId}`);
    await sequelize.query(`DELETE FROM community_members WHERE userId = ${userId}`);
    await sequelize.query(`DELETE FROM notifications WHERE userId = ${userId}`);
    await sequelize.query(`DELETE FROM user_badges WHERE userId = ${userId}`);
    await sequelize.query(`DELETE FROM transactions WHERE userId = ${userId}`);
    await sequelize.query(`DELETE FROM wallets WHERE userId = ${userId}`);
    await sequelize.query(`DELETE FROM user_skills WHERE userId = ${userId}`);
    await sequelize.query(`DELETE FROM achievements WHERE userId = ${userId}`);
    await sequelize.query(`DELETE FROM certificates WHERE userId = ${userId}`);
    await sequelize.query(`DELETE FROM users WHERE id = ${userId}`);
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    res.json({ message: 'User and all related data deleted successfully.' });
  } catch (error) {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
    console.error('DeleteUser error:', error);
    res.status(500).json({ message: 'Server error during user deletion.' });
  }
};

const getTopTalent = async (req, res) => {
  try {
    const { skill, minRating = 0 } = req.query;
    let where = { role: { [Op.ne]: 'admin' }, averageRating: { [Op.gte]: parseFloat(minRating) } };
    if (skill) {
      where.skillsOffered = { [Op.like]: `%${skill}%` };
    }
    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{ model: Achievement, as: 'achievements' }],
      order: [['reputationScore', 'DESC'], ['averageRating', 'DESC']],
      limit: 50,
    });
    res.json({ users });
  } catch (error) {
    console.error('GetTopTalent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createRecruiter = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found to make recruiter' });
    }
    user.role = 'recruiter';
    await user.save();
    res.json({ message: 'User successfully assigned recruiter role', user });
  } catch (error) {
    console.error('CreateRecruiter error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllUsers, getAllSessions, getAnalytics, verifyUser, deleteUser, getTopTalent, createRecruiter };
