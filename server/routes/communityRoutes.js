const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Protected routes (User must be logged in to see or post to the community)

// Fetch Global Feed
router.get('/feed', auth, communityController.getFeed);

// Create a new post. Expects an 'achievementImage' file field (optional)
router.post('/achievements', auth, upload.single('achievementImage'), communityController.postAchievement);

// Delete a post
router.delete('/achievements/:id', auth, communityController.deleteAchievement);

// Like a post
router.put('/achievements/:id/like', auth, communityController.likeAchievement);

// Comment on a post
router.post('/achievements/comment', auth, communityController.postComment);

// Community Routes
router.get('/', auth, communityController.getCommunities);
router.post('/', auth, communityController.createCommunity);
router.get('/:id', auth, communityController.getCommunityDetails);
router.delete('/:id', auth, communityController.deleteCommunity);
router.post('/:id/join', auth, communityController.joinCommunity);
router.post('/:id/posts', auth, communityController.createPost);

module.exports = router;
