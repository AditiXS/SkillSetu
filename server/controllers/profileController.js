const { User, Certificate, Achievement } = require('../models');
const { uploadToCloudinary } = require('../config/cloudinary');

// Get any user's public profile
exports.getPublicProfile = async (req, res) => {
  try {
    const userId = req.params.id || req.userId;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password', 'resetPasswordToken', 'resetPasswordExpires'] },
      include: [
        { model: Certificate, as: 'certificates' },
        { model: Achievement, as: 'achievements', order: [['createdAt', 'DESC']] }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error('getPublicProfile error:', err);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// Update own profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, bio, skillsOffered, skillsWanted, mobileNumber, githubLink, portfolioLink } = req.body;
    
    let profilePictureUrl = undefined;
    if (req.file) {
      // Upload to Cloudinary instead of saving locally
      profilePictureUrl = await uploadToCloudinary(req.file.buffer, 'skillsetu/profiles');
    }

    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (fullName) user.fullName = fullName;
    if (bio !== undefined) user.bio = bio;
    if (skillsOffered !== undefined) user.skillsOffered = skillsOffered;
    if (skillsWanted !== undefined) user.skillsWanted = skillsWanted;
    if (mobileNumber !== undefined) user.mobileNumber = mobileNumber;
    if (githubLink !== undefined) user.githubLink = githubLink;
    if (portfolioLink !== undefined) user.portfolioLink = portfolioLink;
    if (profilePictureUrl) user.profilePicture = profilePictureUrl;

    await user.save();

    res.status(200).json({ 
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        credits: user.credits,
        skillsOffered: user.skillsOffered,
        skillsWanted: user.skillsWanted,
        bio: user.bio,
        mobileNumber: user.mobileNumber,
        githubLink: user.githubLink,
        portfolioLink: user.portfolioLink,
        profilePicture: user.profilePicture
      }
    });

  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// Add Certificate
exports.addCertificate = async (req, res) => {
  try {
    const { title, issuer, issueDate } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: 'Certificate image is required.' });
    }

    // Upload to Cloudinary
    const imageUrl = await uploadToCloudinary(req.file.buffer, 'skillsetu/certificates');

    const certificate = await Certificate.create({
      title,
      issuer,
      issueDate: issueDate || null,
      imageUrl,
      userId: req.userId
    });

    res.status(201).json({ message: 'Certificate added successfully', certificate });
  } catch (err) {
    console.error('addCertificate error:', err);
    res.status(500).json({ message: 'Error adding certificate' });
  }
};

// Set a certificate as Featured
exports.featureCertificate = async (req, res) => {
  try {
    const { certId } = req.params;
    const userId = req.userId;

    // Verify certificate belongs to user
    const certificate = await Certificate.findOne({ where: { id: certId, userId } });
    if (!certificate) return res.status(404).json({ message: 'Certificate not found' });

    // Unfeature all certificates for this user
    await Certificate.update({ isFeatured: false }, { where: { userId } });

    // Feature the selected one
    certificate.isFeatured = true;
    await certificate.save();

    res.status(200).json({ message: 'Featured certificate updated', certificate });
  } catch (err) {
    console.error('featureCertificate error:', err);
    res.status(500).json({ message: 'Error updating featured certificate' });
  }
};
