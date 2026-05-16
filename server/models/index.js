const User = require('./User');
const Certificate = require('./Certificate');
const Achievement = require('./Achievement');
const Skill = require('./Skill');
const UserSkill = require('./UserSkill');
const SessionRequest = require('./SessionRequest');
const Session = require('./Session');
const Message = require('./Message');
const Rating = require('./Rating');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const Badge = require('./Badge');
const UserBadge = require('./UserBadge');
const Notification = require('./Notification');
const Community = require('./Community');
const CommunityMember = require('./CommunityMember');
const CommunityPost = require('./CommunityPost');
const Comment = require('./Comment');

// --- Existing SkillSetu associations ---
User.hasMany(Certificate, { foreignKey: 'userId', as: 'certificates' });
Certificate.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Achievement, { foreignKey: 'userId', as: 'achievements' });
Achievement.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// --- Achievement Comment associations ---
Achievement.hasMany(Comment, { foreignKey: 'achievementId', as: 'comments' });
Comment.belongsTo(Achievement, { foreignKey: 'achievementId', as: 'achievement' });
User.hasMany(Comment, { foreignKey: 'userId', as: 'achievementComments' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// --- Skill associations ---
User.belongsToMany(Skill, { through: UserSkill, foreignKey: 'userId', as: 'skills' });
Skill.belongsToMany(User, { through: UserSkill, foreignKey: 'skillId', as: 'users' });
User.hasMany(UserSkill, { foreignKey: 'userId', as: 'userSkills' });
UserSkill.belongsTo(User, { foreignKey: 'userId' });
UserSkill.belongsTo(Skill, { foreignKey: 'skillId' });

// --- Session Request associations ---
User.hasMany(SessionRequest, { foreignKey: 'senderId', as: 'sentRequests' });
User.hasMany(SessionRequest, { foreignKey: 'receiverId', as: 'receivedRequests' });
SessionRequest.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
SessionRequest.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });
SessionRequest.belongsTo(Skill, { foreignKey: 'skillId', as: 'skill' });

// --- Session associations ---
Session.belongsTo(User, { foreignKey: 'mentorId', as: 'mentor' });
Session.belongsTo(User, { foreignKey: 'learnerId', as: 'learner' });
Session.belongsTo(Skill, { foreignKey: 'skillId', as: 'skill' });
Session.belongsTo(SessionRequest, { foreignKey: 'requestId', as: 'request' });
User.hasMany(Session, { foreignKey: 'mentorId', as: 'mentorSessions' });
User.hasMany(Session, { foreignKey: 'learnerId', as: 'learnerSessions' });

// --- Message associations ---
Session.hasMany(Message, { foreignKey: 'sessionId', as: 'messages' });
Message.belongsTo(Session, { foreignKey: 'sessionId' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// --- Rating associations ---
Session.hasMany(Rating, { foreignKey: 'sessionId', as: 'ratings' });
Rating.belongsTo(Session, { foreignKey: 'sessionId' });
Rating.belongsTo(User, { foreignKey: 'raterId', as: 'rater' });
Rating.belongsTo(User, { foreignKey: 'ratedUserId', as: 'ratedUser' });

// --- Wallet associations ---
User.hasOne(Wallet, { foreignKey: 'userId', as: 'wallet' });
Wallet.belongsTo(User, { foreignKey: 'userId' });

// --- Transaction associations ---
User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
Transaction.belongsTo(User, { foreignKey: 'userId' });

// --- Badge associations ---
User.belongsToMany(Badge, { through: UserBadge, foreignKey: 'userId', as: 'badges' });
Badge.belongsToMany(User, { through: UserBadge, foreignKey: 'badgeId', as: 'users' });
User.hasMany(UserBadge, { foreignKey: 'userId', as: 'userBadges' });

// --- Notification associations ---
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId' });

// --- Community associations ---
User.hasMany(Community, { foreignKey: 'creatorId', as: 'createdCommunities' });
Community.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

Community.belongsToMany(User, { through: CommunityMember, foreignKey: 'communityId', as: 'members' });
User.belongsToMany(Community, { through: CommunityMember, foreignKey: 'userId', as: 'communities' });
Community.hasMany(CommunityMember, { foreignKey: 'communityId', as: 'communityMemberships' });
CommunityMember.belongsTo(Community, { foreignKey: 'communityId' });
CommunityMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Community.hasMany(CommunityPost, { foreignKey: 'communityId', as: 'posts' });
CommunityPost.belongsTo(Community, { foreignKey: 'communityId' });
User.hasMany(CommunityPost, { foreignKey: 'userId', as: 'communityPosts' });
CommunityPost.belongsTo(User, { foreignKey: 'userId', as: 'author' });

module.exports = {
  User,
  Certificate,
  Achievement,
  Comment,
  Skill,
  UserSkill,
  SessionRequest,
  Session,
  Message,
  Rating,
  Wallet,
  Transaction,
  Badge,
  UserBadge,
  Notification,
  Community,
  CommunityMember,
  CommunityPost,
};
