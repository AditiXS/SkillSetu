const Achievement = require('../models/Achievement');
const User = require('../models/User');

// Fetch the global achievement feed
exports.getFeed = async (req, res) => {
  try {
    const achievements = await Achievement.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'fullName', 'profilePicture', 'bio'] // Send enough info for feed cards
        }
      ]
    });

    res.status(200).json({ achievements });
  } catch (err) {
    console.error('getFeed error:', err);
    res.status(500).json({ message: 'Error fetching community feed' });
  }
};

// Post a new achievement
exports.postAchievement = async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ message: 'Post content cannot be empty' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const post = await Achievement.create({
      content,
      imageUrl,
      userId: req.userId
    });

    // Fetch the newly created post with user data so the frontend can immediately display it correctly
    const postWithUser = await Achievement.findByPk(post.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'profilePicture', 'bio'] }]
    });

    res.status(201).json({ message: 'Achievement posted!', post: postWithUser });
  } catch (err) {
    console.error('postAchievement error:', err);
    res.status(500).json({ message: 'Error posting achievement' });
  }
};

// Delete an achievement
exports.deleteAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    
    const achievement = await Achievement.findByPk(id);
    if (!achievement) {
      return res.status(404).json({ message: 'Achievement not found' });
    }

    // Security check: Only the author can delete their post
    if (achievement.userId !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized to delete this post' });
    }

    await achievement.destroy();
    res.status(200).json({ message: 'Achievement deleted successfully' });
  } catch (err) {
    console.error('deleteAchievement error:', err);
    res.status(500).json({ message: 'Error deleting achievement' });
  }
};

// Like/Congratulate an achievement
exports.likeAchievement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const achievement = await Achievement.findByPk(id);
    if (!achievement) return res.status(404).json({ message: 'Achievement not found' });

    // Initialize array if it somehow doesn't exist
    let likers = achievement.likedBy || [];
    
    // Parse if it's a string (MySQL sometimes returns JSON as string)
    if (typeof likers === 'string') {
      try { likers = JSON.parse(likers); } catch(e) { likers = []; }
    }

    if (likers.includes(userId)) {
      return res.status(400).json({ message: 'You have already congratulated this user!' });
    }

    likers.push(userId);
    achievement.likedBy = likers;
    achievement.likesCount += 1;
    await achievement.save();

    res.status(200).json({ message: 'Celebrated!', likesCount: achievement.likesCount });
  } catch (err) {
    console.error('likeAchievement error:', err);
    res.status(500).json({ message: 'Error liking achievement' });
  }
};

const { Community, CommunityMember, CommunityPost } = require('../models');

// Communities
exports.getCommunities = async (req, res) => {
  try {
    const communities = await Community.findAll({
      order: [['memberCount', 'DESC']],
    });
    res.json({ communities });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createCommunity = async (req, res) => {
  try {
    const { name, description } = req.body;
    const existing = await Community.findOne({ where: { name } });
    if (existing) return res.status(400).json({ message: 'Community name taken' });

    const community = await Community.create({ name, description, creatorId: req.userId });
    await CommunityMember.create({ communityId: community.id, userId: req.userId, role: 'leader' });
    
    res.json({ message: 'Community created', community });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const community = await Community.findByPk(id);

    if (!community) return res.status(404).json({ message: 'Community not found' });

    // Only the creator can delete the community
    if (community.creatorId !== req.userId) {
      return res.status(403).json({ message: 'Only the creator can delete this community' });
    }

    await community.destroy();
    res.status(200).json({ message: 'Community deleted successfully' });
  } catch (error) {
    console.error('deleteCommunity error:', error);
    res.status(500).json({ message: 'Server error while deleting community' });
  }
};

exports.getCommunityDetails = async (req, res) => {
  try {
    const community = await Community.findByPk(req.params.id, {
      include: [
        { model: CommunityMember, as: 'communityMemberships', include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'profilePicture'] }] },
        { model: CommunityPost, as: 'posts', include: [{ model: User, as: 'author', attributes: ['id', 'fullName'] }], order: [['createdAt', 'DESC']] },
      ],
    });
    if (!community) return res.status(404).json({ message: 'Community not found' });
    res.json({ community });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.joinCommunity = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await CommunityMember.findOne({ where: { communityId: id, userId: req.userId } });
    if (existing) return res.status(400).json({ message: 'Already a member' });

    await CommunityMember.create({ communityId: id, userId: req.userId, role: 'member' });
    await Community.increment('memberCount', { where: { id } });

    res.json({ message: 'Joined community successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const { id } = req.params;
    const isMember = await CommunityMember.findOne({ where: { communityId: id, userId: req.userId } });
    if (!isMember) return res.status(403).json({ message: 'Must be a member to post' });

    const post = await CommunityPost.create({ communityId: id, userId: req.userId, content });
    res.json({ message: 'Post created', post });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
