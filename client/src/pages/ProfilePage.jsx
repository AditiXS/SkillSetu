import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Mail, Phone, ExternalLink, Link as LinkIcon, Edit3, X, Star, Trash2 } from 'lucide-react';
import './ProfilePage.css';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingCert, setIsAddingCert] = useState(false);

  // Edit State
  const [editForm, setEditForm] = useState({});
  const [profilePicFile, setProfilePicFile] = useState(null);

  // Certificate State
  const [certForm, setCertForm] = useState({ title: '', issuer: '' });
  const [certFile, setCertFile] = useState(null);
  
  // Journey/Achievement State
  const [isAddingJourney, setIsAddingJourney] = useState(false);
  const [journeyForm, setJourneyForm] = useState({ content: '' });
  const [journeyFile, setJourneyFile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.getProfile();
      setProfile(res.user);
      setEditForm(res.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validateEditForm = () => {
    if (!editForm.fullName || editForm.fullName.trim().length < 2) {
      alert('Please enter a valid full name (at least 2 characters).');
      return false;
    }
    
    if (editForm.bio && editForm.bio.length > 300) {
      alert('Bio is too long (maximum 300 characters).');
      return false;
    }

    const urlPattern = /^https?:\/\/.+/i;
    if (editForm.githubLink && !urlPattern.test(editForm.githubLink)) {
      alert('Please enter a valid GitHub URL starting with http:// or https://');
      return false;
    }
    if (editForm.portfolioLink && !urlPattern.test(editForm.portfolioLink)) {
      alert('Please enter a valid Portfolio URL starting with http:// or https://');
      return false;
    }

    const phonePattern = /^\+?[\d\s-]{10,}$/;
    if (editForm.mobileNumber && !phonePattern.test(editForm.mobileNumber)) {
      alert('Please enter a valid mobile number.');
      return false;
    }

    return true;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;
    
    try {
      const formData = new FormData();
      formData.append('fullName', editForm.fullName || '');
      formData.append('bio', editForm.bio || '');
      formData.append('mobileNumber', editForm.mobileNumber || '');
      formData.append('githubLink', editForm.githubLink || '');
      formData.append('portfolioLink', editForm.portfolioLink || '');
      formData.append('skillsOffered', editForm.skillsOffered || '');
      formData.append('skillsWanted', editForm.skillsWanted || '');

      if (profilePicFile) formData.append('profilePicture', profilePicFile);

      const res = await api.updateProfile(formData);
      setProfile({ ...profile, ...res.user });
      setIsEditing(false);
      setProfilePicFile(null);
      fetchProfile();
    } catch (err) {
      alert(err.message || 'Error updating profile');
    }
  };

  const handleCertSubmit = async (e) => {
    e.preventDefault();
    if (!certFile) {
      alert('Certificate image is required');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('title', certForm.title);
      formData.append('issuer', certForm.issuer);
      formData.append('certificateImage', certFile);

      await api.addCertificate(formData);
      setIsAddingCert(false);
      setCertForm({ title: '', issuer: '' });
      setCertFile(null);
      fetchProfile();
    } catch (err) {
      alert(err.message || 'Error adding certificate');
    }
  };

  const handleFeatureCert = async (certId) => {
    try {
      await api.featureCertificate(certId);
      fetchProfile();
    } catch (err) {
      alert(err.message || 'Error featuring certificate');
    }
  };

  const handleDeletePost = async (id) => {
    if (!window.confirm('Are you sure you want to delete this specific achievement?')) return;
    try {
      await api.deleteAchievement(id);
      fetchProfile();
    } catch (err) {
      alert(err.message || 'Error deleting achievement');
    }
  };

  const handleJourneySubmit = async (e) => {
    e.preventDefault();
    if (!journeyForm.content.trim()) return;
    
    try {
      const formData = new FormData();
      formData.append('content', journeyForm.content);
      if (journeyFile) formData.append('achievementImage', journeyFile);
      
      await api.postAchievement(formData);
      setIsAddingJourney(false);
      setJourneyForm({ content: '' });
      setJourneyFile(null);
      fetchProfile();
    } catch (err) {
      alert(err.message || 'Error posting to journey');
    }
  };

  if (loading) return <div>Loading...</div>;

  const profileImageUrl = profile?.profilePicture 
    ? (profile.profilePicture?.startsWith('http') ? profile.profilePicture : `${import.meta.env.VITE_API_URL.replace('/api', '')}${profile.profilePicture}`) 
    : 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?q=80&w=2671&auto=format&fit=crop'; // Artistic placeholder
  
  // Find featured, fallback to first cert, fallback to placeholder
  const featured = profile?.certificates?.find(c => c.isFeatured) || profile?.certificates?.[0];
  const featuredCertImageUrl = featured 
    ? (featured.imageUrl?.startsWith('http') ? featured.imageUrl : `${import.meta.env.VITE_API_URL.replace('/api', '')}${featured.imageUrl}`)
    : 'https://images.unsplash.com/photo-1583597089405-b0af2b9e6931?q=80&w=2670&auto=format&fit=crop'; // Artistic placeholder

  return (
    <div className="p-0">
        
        {isEditing ? (
          <div className="editorial-edit-form">
            <div className="edit-header">
              <h1 className="editorial-title">Edit Profile</h1>
              <button type="button" onClick={() => setIsEditing(false)} className="editorial-btn-close"><X size={24}/></button>
            </div>
            <form onSubmit={handleEditSubmit} className="editorial-grid-form">
                <div className="edit-group">
                  <label>Profile Picture</label>
                  <input type="file" accept="image/*" onChange={(e) => setProfilePicFile(e.target.files[0])} />
                </div>
                <div className="edit-group">
                  <label>Full Name</label>
                  <input type="text" value={editForm.fullName || ''} onChange={(e) => setEditForm({...editForm, fullName: e.target.value})} required />
                </div>
                <div className="edit-group col-span-2">
                  <label>Bio</label>
                  <textarea value={editForm.bio || ''} onChange={(e) => setEditForm({...editForm, bio: e.target.value})} rows={3}/>
                </div>
                <div className="edit-group">
                  <label>Mobile Number</label>
                  <input type="text" value={editForm.mobileNumber || ''} onChange={(e) => setEditForm({...editForm, mobileNumber: e.target.value})} />
                </div>
                <div className="edit-group">
                  <label>GitHub Link</label>
                  <input type="url" placeholder="https://github.com/yourusername" value={editForm.githubLink || ''} onChange={(e) => setEditForm({...editForm, githubLink: e.target.value})} />
                </div>
                <div className="edit-group">
                  <label>Portfolio Link</label>
                  <input type="url" placeholder="https://yourportfolio.com" value={editForm.portfolioLink || ''} onChange={(e) => setEditForm({...editForm, portfolioLink: e.target.value})} />
                </div>
                <div className="edit-group col-span-2">
                  <label>Skills to Teach (comma separated)</label>
                  <input type="text" value={editForm.skillsOffered || ''} onChange={(e) => setEditForm({...editForm, skillsOffered: e.target.value})} />
                </div>
                <div className="edit-group col-span-2">
                  <label>Skills to Learn (comma separated)</label>
                  <input type="text" value={editForm.skillsWanted || ''} onChange={(e) => setEditForm({...editForm, skillsWanted: e.target.value})} />
                </div>
                <div className="col-span-2 mt-4">
                  <button type="submit" className="editorial-btn-primary">Save Changes</button>
                </div>
            </form>
          </div>
        ) : (
          <div className="editorial-layout">
            
            {/* Left Column: Text Content */}
            <div className="editorial-left">
              <div className="editorial-eyebrow">Member Profile</div>
              <h1 className="editorial-title">{profile?.fullName}</h1>
              
              <p className="editorial-bio">
                {profile?.bio || "A passionate member of the SkillSetu community. Currently exploring new skills and sharing knowledge."}
              </p>
              
              <div className="editorial-links">
                {profile?.email && (
                  <a href={`mailto:${profile.email}`} className="editorial-link">
                    <Mail size={14}/> {profile.email}
                  </a>
                )}
                {profile?.mobileNumber && (
                  <span className="editorial-link">
                    <Phone size={14}/> {profile.mobileNumber}
                  </span>
                )}
                {profile?.githubLink && (
                  <a href={profile.githubLink} target="_blank" rel="noreferrer" className="editorial-link">
                    <LinkIcon size={14}/> GitHub
                  </a>
                )}
                {profile?.portfolioLink && (
                  <a href={profile.portfolioLink} target="_blank" rel="noreferrer" className="editorial-link">
                    <ExternalLink size={14}/> Portfolio
                  </a>
                )}
              </div>
              
              <button className="editorial-read-more" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            </div>
            
            {/* Right Column: High Impact Imagery */}
            <div className="editorial-right">
              <div className="editorial-main-img-wrapper">
                <img src={profileImageUrl} alt="Main Profile" className="editorial-main-img" />
                
                {/* Overlapping Cert Image (Like the bottom right image in the ref) */}
                <div className="editorial-overlap-img-wrapper">
                  <img src={featuredCertImageUrl} alt="Featured Ceritificate" className="editorial-overlap-img" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Below the Fold Content */}
        {!isEditing && (
          <div className="editorial-below-fold">
            <div className="editorial-skills-section">
              <div className="editorial-section-header">
                <h2>Skill Arsenal</h2>
              </div>
              <div className="editorial-skills-grid">
                <div className="skill-block">
                  <div className="editorial-eyebrow">Offering</div>
                  <div className="skill-tags">
                    {profile?.skillsOffered?.length > 0
                      ? profile.skillsOffered.map((s, i) => <span key={i} className="skill-tag teach">{s}</span>)
                      : <span className="text-muted">No skills offered yet.</span>}
                  </div>
                </div>
                <div className="skill-block">
                  <div className="editorial-eyebrow">Seeking</div>
                  <div className="skill-tags">
                    {profile?.skillsWanted?.length > 0
                      ? profile.skillsWanted.map((s, i) => <span key={i} className="skill-tag learn">{s}</span>)
                      : <span className="text-muted">No skills wanted yet.</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="editorial-split-section">
              {/* Achievements Column */}
              <div className="editorial-achievements">
                <div className="editorial-section-header">
                  <h2>The Journey</h2>
                  <button className="editorial-read-more small" onClick={() => setIsAddingJourney(!isAddingJourney)}>
                    {isAddingJourney ? 'Cancel' : 'Add Update +'}
                  </button>
                </div>

                {isAddingJourney && (
                  <form onSubmit={handleJourneySubmit} className="editorial-add-journey">
                    <textarea 
                      placeholder="Share a milestone, a lesson learned, or a project update..." 
                      required 
                      value={journeyForm.content} 
                      onChange={e => setJourneyForm({...journeyForm, content: e.target.value})}
                      rows={3}
                    />
                    <div className="form-footer">
                      <input type="file" accept="image/*" onChange={e => setJourneyFile(e.target.files[0])} id="journey-upload" hidden />
                      <label htmlFor="journey-upload" className="file-label">
                        {journeyFile ? '📷 Image selected' : '📷 Add Image'}
                      </label>
                      <button type="submit" className="editorial-btn-primary small">Post Update</button>
                    </div>
                  </form>
                )}
                <div className="editorial-feed">
                  {profile?.achievements?.length > 0 ? profile.achievements.map((post) => (
                    <div key={post.id} className="editorial-feed-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                        <span className="editorial-date">{new Date(post.createdAt).toLocaleDateString()}</span>
                        <button 
                          className="delete-post-btn-sm" 
                          onClick={() => handleDeletePost(post.id)}
                          title="Delete Post"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p className="editorial-post-text">{post.content}</p>
                      {post.imageUrl && (
                        <img src={(post.imageUrl?.startsWith('http') ? post.imageUrl : `${import.meta.env.VITE_API_URL.replace('/api', '')}${post.imageUrl}`)} alt="Post visual" className="editorial-post-img" />
                      )}
                    </div>
                  )) : (
                    <p className="text-muted">The journey has just begun. No achievements posted yet.</p>
                  )}
                </div>
              </div>

              {/* Certificates Column */}
              <div className="editorial-certificates">
                <div className="editorial-section-header">
                  <h2>Credentials</h2>
                  <button className="editorial-read-more small" onClick={() => setIsAddingCert(!isAddingCert)}>
                    {isAddingCert ? 'Cancel' : 'Add Cert +'}
                  </button>
                </div>
                
                {isAddingCert && (
                  <form onSubmit={handleCertSubmit} className="editorial-add-cert">
                    <input type="text" placeholder="Certificate Title" required value={certForm.title} onChange={e => setCertForm({...certForm, title: e.target.value})} />
                    <input type="text" placeholder="Issuing Organization" required value={certForm.issuer} onChange={e => setCertForm({...certForm, issuer: e.target.value})} />
                    <input type="file" accept="image/*" required onChange={e => setCertFile(e.target.files[0])} />
                    <button type="submit" className="editorial-btn-primary small">Upload</button>
                  </form>
                )}

                <div className="editorial-cert-list">
                  {profile?.certificates?.length > 0 ? profile.certificates.map(cert => (
                    <div key={cert.id} className="editorial-cert-card">
                      <img src={(cert.imageUrl?.startsWith('http') ? cert.imageUrl : `${import.meta.env.VITE_API_URL.replace('/api', '')}${cert.imageUrl}`)} alt={cert.title} />
                      <div className="cert-text">
                        <h4>{cert.title}</h4>
                        <p>{cert.issuer}</p>
                        <button 
                          onClick={() => handleFeatureCert(cert.id)} 
                          className={`cert-star-btn ${cert.isFeatured ? 'featured' : ''}`}
                          title={cert.isFeatured ? "Featured" : "Set as Featured"}
                        >
                          <Star size={18} fill={cert.isFeatured ? "#f04e23" : "transparent"} color={cert.isFeatured ? "#f04e23" : "#999"} /> 
                          {cert.isFeatured && <span> Featured</span>}
                        </button>
                      </div>
                    </div>
                  )) : (
                     <p className="text-muted">No credentials uploaded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ProfilePage;
