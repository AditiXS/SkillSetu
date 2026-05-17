const { Op } = require('sequelize');
const {
  SessionRequest, Session, User, Skill, Wallet, Transaction, Notification, Message, Rating,
} = require('../models');
const { sendMail, templates } = require('../utils/mailer');

const calculateCredits = (duration, isMentorSession) => {
  const baseRate = isMentorSession ? 2 : 1;
  return Math.ceil(duration / 15) * baseRate;
};

const createRequest = async (req, res) => {
  try {
    const { receiverId, skillId, topic, description, duration, scheduledDate } = req.body;
    if (!topic || !scheduledDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate that the scheduled date is not in the past
    const scheduled = new Date(scheduledDate);
    const now = new Date();
    // Strip seconds and milliseconds for a fair "present" comparison
    scheduled.setSeconds(0, 0);
    now.setSeconds(0, 0);

    if (scheduled < now) {
      return res.status(400).json({ message: 'Session cannot be scheduled in the past. Please choose a current or future time.' });
    }

    if (req.userId === parseInt(receiverId)) {
      return res.status(400).json({ message: 'Cannot send request to yourself' });
    }

    const receiver = await User.findByPk(receiverId);
    if (!receiver) return res.status(404).json({ message: 'User not found' });

    // If the receiver is a mentor/certified, the requester pays. If they are a normal user, it's free.
    const isMentorSession = receiver.isVerified || receiver.role === 'mentor';
    const creditsRequired = isMentorSession ? calculateCredits(duration || 60, true) : 0;

    if (creditsRequired > 0) {
      let wallet = await Wallet.findOne({ where: { userId: req.userId } });
      if (!wallet) {
        // Auto-create wallet for legacy users who don't have one
        wallet = await Wallet.create({ userId: req.userId, balance: 150 });
      }
      
      if (wallet.balance < creditsRequired) {
        return res.status(400).json({ message: 'Insufficient credits', required: creditsRequired });
      }
    }

    const request = await SessionRequest.create({
      senderId: req.userId,
      receiverId: parseInt(receiverId),
      skillId: skillId || null,
      topic,
      description: description || '',
      duration: duration || 60,
      scheduledDate,
      creditsRequired,
    });

    const sender = await User.findByPk(req.userId, { attributes: ['fullName'] });
    await Notification.create({
      userId: parseInt(receiverId),
      type: 'session_request',
      title: 'New Session Request',
      message: `${sender.fullName} wants to learn ${topic} from you`,
      linkTo: '/requests',
    });

    // Send email to receiver
    const requestEmail = templates.sessionRequest(receiver.fullName, sender.fullName, topic);
    sendMail({ to: receiver.email, ...requestEmail });

    res.status(201).json({ message: 'Session request sent', request });
  } catch (error) {
    console.error('CreateRequest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRequests = async (req, res) => {
  try {
    const { type = 'received' } = req.query;
    const where = type === 'sent'
      ? { senderId: req.userId }
      : { receiverId: req.userId };

    const requests = await SessionRequest.findAll({
      where,
      include: [
        { model: User, as: 'sender', attributes: ['id', 'fullName', 'email', 'profilePicture', 'isVerified', 'averageRating'] },
        { model: User, as: 'receiver', attributes: ['id', 'fullName', 'email', 'profilePicture', 'isVerified', 'averageRating'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ requests });
  } catch (error) {
    console.error('GetRequests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const acceptRequest = async (req, res) => {
  try {
    const request = await SessionRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.receiverId !== req.userId) return res.status(403).json({ message: 'Not authorized' });
    if (request.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

    request.status = 'accepted';
    await request.save();

    const receiver = await User.findByPk(request.receiverId);
    const isMentorSession = receiver.isVerified || receiver.role === 'mentor';

    if (isMentorSession && request.creditsRequired > 0) {
      let wallet = await Wallet.findOne({ where: { userId: request.senderId } });
      if (!wallet) {
        wallet = await Wallet.create({ userId: request.senderId, balance: 100 });
      }
      
      if (wallet.balance < request.creditsRequired) {
        request.status = 'pending';
        await request.save();
        return res.status(400).json({ message: 'Learner has insufficient credits' });
      }
      wallet.balance -= request.creditsRequired;
      wallet.locked += request.creditsRequired;
      await wallet.save();

      await Transaction.create({
        userId: request.senderId,
        type: 'locked',
        amount: request.creditsRequired,
        description: `Credits locked for session: ${request.topic}`,
        balanceAfter: wallet.balance,
      });
    }

    const session = await Session.create({
      requestId: request.id,
      mentorId: request.receiverId,
      learnerId: request.senderId,
      skillId: request.skillId,
      topic: request.topic,
      duration: request.duration,
      scheduledDate: request.scheduledDate,
      isMentorSession,
      creditsLocked: request.creditsRequired,
    });

    await Notification.create({
      userId: request.senderId,
      type: 'request_accepted',
      title: 'Request Accepted!',
      message: `${receiver.fullName} accepted your session request for ${request.topic}`,
      linkTo: `/session/${session.id}`,
    });

    // Send session-accepted email to the learner
    const sender = await User.findByPk(request.senderId, { attributes: ['fullName', 'email'] });
    const acceptedEmail = templates.sessionAccepted(sender.fullName, receiver.fullName, request.topic, request.scheduledDate);
    sendMail({ to: sender.email, ...acceptedEmail });

    await Message.create({
      sessionId: session.id,
      senderId: request.receiverId,
      content: `Session created! Topic: ${request.topic}. Scheduled for ${new Date(request.scheduledDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}. Duration: ${request.duration} minutes.`,
      type: 'system',
    });

    res.json({ message: 'Request accepted, session created', session });
  } catch (error) {
    console.error('AcceptRequest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const rejectRequest = async (req, res) => {
  try {
    const request = await SessionRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.receiverId !== req.userId) return res.status(403).json({ message: 'Not authorized' });
    
    request.status = 'rejected';
    await request.save();

    const receiver = await User.findByPk(req.userId, { attributes: ['fullName'] });
    await Notification.create({
      userId: request.senderId,
      type: 'request_rejected',
      title: 'Request Declined',
      message: `${receiver.fullName} declined your session request for ${request.topic}`,
      linkTo: '/requests',
    });

    res.json({ message: 'Request rejected' });
  } catch (error) {
    console.error('RejectRequest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getSession = async (req, res) => {
  try {
    const session = await Session.findByPk(req.params.id, {
      include: [
        { model: User, as: 'mentor', attributes: { exclude: ['password'] } },
        { model: User, as: 'learner', attributes: { exclude: ['password'] } },
        { model: Rating, as: 'ratings' },
      ],
    });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.mentorId !== req.userId && session.learnerId !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json({ session });
  } catch (error) {
    console.error('GetSession error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserSessions = async (req, res) => {
  try {
    const sessions = await Session.findAll({
      where: {
        [Op.or]: [{ mentorId: req.userId }, { learnerId: req.userId }],
      },
      include: [
        { model: User, as: 'mentor', attributes: ['id', 'fullName', 'profilePicture', 'isVerified'] },
        { model: User, as: 'learner', attributes: ['id', 'fullName', 'profilePicture', 'isVerified'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ sessions });
  } catch (error) {
    console.error('GetUserSessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const startSession = async (req, res) => {
  try {
    const session = await Session.findByPk(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.mentorId !== req.userId && session.learnerId !== req.userId) return res.status(403).json({ message: 'Not authorized' });
    if (session.status !== 'confirmed') return res.status(400).json({ message: 'Session cannot be started' });

    // Block starting the session before its scheduled time
    const now = new Date();
    const scheduledAt = new Date(session.scheduledDate);
    if (now < scheduledAt) {
      const minutesLeft = Math.ceil((scheduledAt - now) / 60000);
      return res.status(400).json({
        message: `Session cannot be started yet. It is scheduled to begin in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
        scheduledDate: session.scheduledDate,
      });
    }

    session.status = 'active';
    session.startTime = new Date();
    await session.save();

    await Message.create({ sessionId: session.id, senderId: session.mentorId, content: 'Session has started! Timer is running.', type: 'system' });
    res.json({ message: 'Session started', session });
  } catch (error) {
    console.error('StartSession error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const completeSession = async (req, res) => {
  try {
    const session = await Session.findByPk(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.mentorId !== req.userId && session.learnerId !== req.userId) return res.status(403).json({ message: 'Not authorized' });
    if (session.status !== 'active') return res.status(400).json({ message: 'Session is not active' });

    const msgCount = await Message.count({
      where: { sessionId: session.id, type: { [Op.ne]: 'system' } },
    });

    session.status = 'completed';
    session.endTime = new Date();
    session.messageCount = msgCount;
    await session.save();

    await User.increment('sessionsCompleted', { where: { id: { [Op.in]: [session.mentorId, session.learnerId] } } });
    const hoursSpent = session.duration / 60;
    await User.increment({ totalHoursTaught: hoursSpent }, { where: { id: session.mentorId } });
    await User.increment({ totalHoursLearned: hoursSpent }, { where: { id: session.learnerId } });

    await Message.create({ sessionId: session.id, senderId: session.mentorId, content: 'Session completed! Please rate your experience.', type: 'system' });

    const notifData = [session.mentorId, session.learnerId].map(userId => ({
      userId,
      type: 'session_completed',
      title: 'Session Completed 🎉',
      message: `Your session on "${session.topic}" is complete! Please rate your experience.`,
      linkTo: `/session/${session.id}`,
    }));
    await Notification.bulkCreate(notifData);

    // Send session-completed email to both mentor and learner
    const [mentor, learner] = await Promise.all([
      User.findByPk(session.mentorId, { attributes: ['fullName', 'email'] }),
      User.findByPk(session.learnerId, { attributes: ['fullName', 'email'] }),
    ]);
    const mentorEmail = templates.sessionCompleted(mentor.fullName, session.topic, session.id);
    const learnerEmail = templates.sessionCompleted(learner.fullName, session.topic, session.id);
    sendMail({ to: mentor.email, ...mentorEmail });
    sendMail({ to: learner.email, ...learnerEmail });

    res.json({ message: 'Session completed', session });
  } catch (error) {
    console.error('CompleteSession error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createRequest, getRequests, acceptRequest, rejectRequest,
  getSession, getUserSessions, startSession, completeSession,
};
