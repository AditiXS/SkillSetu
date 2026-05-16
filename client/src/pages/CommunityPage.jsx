import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, X, Globe, Zap, MessageSquare, Trash2 } from 'lucide-react';
import api, { getUser } from '../services/api';
import './CommunityPage.css';

const CommunityPage = () => {
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'groups'
  const [communities, setCommunities] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newComm, setNewComm] = useState({ name: '', description: '' });
  const navigate = useNavigate();
  const currentUser = getUser();

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'groups') {
        const res = await api.getCommunities();
        setCommunities(res.communities || []);
      } else {
        const res = await api.getFeed();
        setAchievements(res.achievements || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createCommunity(newComm);
      setShowModal(false);
      setNewComm({ name: '', description: '' });
      fetchData();
    } catch (error) {
      alert(error.message || 'Error creating community');
    }
  };

  const handleDeleteCommunity = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This will remove all members and posts.`)) return;
    try {
      await api.deleteCommunity(id);
      fetchData();
    } catch (err) {
      alert(err.message || 'Error deleting community');
    }
  };

  const handleLike = async (achievementId) => {
    // Prevent double-clicking if already liked in this session
    const post = achievements.find(a => a.id === achievementId);
    if (post && post.likedBy && post.likedBy.includes(currentUser.id)) {
      return; // Already liked
    }

    try {
      await api.likeAchievement(achievementId);
      // Update count and likedBy list locally
      setAchievements(prev => prev.map(ach => 
        ach.id === achievementId 
          ? { 
              ...ach, 
              likesCount: (ach.likesCount || 0) + 1,
              likedBy: [...(ach.likedBy || []), currentUser.id]
            } 
          : ach
      ));
    } catch (err) {
      if (err.response?.status === 400) {
        // Just refresh the state if backend says already liked
        console.warn('Already liked this post');
      } else {
        console.error('Error liking achievement:', err);
      }
    }
  };

  return (
    <div className="community-hub">
      <div className="community-header">
        <div>
          <h1>Community Hub</h1>
          <p>Celebrate journeys and connect with like-minded learners.</p>
        </div>
        <div className="header-actions">
          <div className="tab-switcher">
            <button 
              className={activeTab === 'feed' ? 'active' : ''} 
              onClick={() => setActiveTab('feed')}
            >
              <Zap size={16} /> The Feed
            </button>
            <button 
              className={activeTab === 'groups' ? 'active' : ''} 
              onClick={() => setActiveTab('groups')}
            >
              <Users size={16} /> Skill Groups
            </button>
          </div>
          {activeTab === 'groups' && (
            <button className="create-comm-btn" onClick={() => setShowModal(true)}>
              <Plus size={20} /> Create Group
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="community-loading">
          <div className="spinner"></div>
          <p>Curating your {activeTab}...</p>
        </div>
      ) : (
        <div className="community-content">
          {activeTab === 'feed' ? (
            <div className="journey-feed">
              {achievements.length > 0 ? achievements.map((ach) => (
                <div key={ach.id} className="feed-card">
                  <div className="feed-card-header">
                    <div className="user-info" onClick={() => navigate(`/users/${ach.userId}`)}>
                      <div className="user-avatar">
                        {ach.user?.profilePicture ? (
                          <img src={(ach.user.profilePicture?.startsWith('http') ? ach.user.profilePicture : `${import.meta.env.VITE_API_URL.replace('/api', '')}${ach.user.profilePicture}`)} alt="" />
                        ) : (
                          <span>{ach.user?.fullName?.[0]}</span>
                        )}
                      </div>
                      <div>
                        <strong>{ach.user?.fullName}</strong>
                        <span className="post-date">{new Date(ach.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <p className="feed-content">{ach.content}</p>
                  {ach.imageUrl && (
                    <div className="feed-image">
                      <img src={(ach.imageUrl?.startsWith('http') ? ach.imageUrl : `${import.meta.env.VITE_API_URL.replace('/api', '')}${ach.imageUrl}`)} alt="Achievement" />
                    </div>
                  )}
                  <div className="feed-footer">
                    <button 
                      className={`feed-action-btn ${(ach.likedBy && ach.likedBy.includes(currentUser.id)) ? 'liked' : ''}`}
                      onClick={() => handleLike(ach.id)}
                      disabled={ach.likedBy && ach.likedBy.includes(currentUser.id)}
                    >
                      <MessageSquare size={16}/> 
                      {(ach.likedBy && ach.likedBy.includes(currentUser.id)) ? 'Celebrated' : 'Congratulate'} 
                      {ach.likesCount > 0 && <span> ({ach.likesCount})</span>}
                    </button>
                  </div>
                </div>
              )) : (
                <div className="empty-state">
                  <Zap size={48} />
                  <h3>No updates yet</h3>
                  <p>Be the first to share your journey milestone on your profile!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="community-grid">
              {communities.map((comm) => (
                <div className="community-card" key={comm.id}>
                  <div className="comm-icon"><Globe size={24} /></div>
                  <h3>{comm.name}</h3>
                  <p>{comm.description}</p>
                  <div className="comm-footer">
                    <div className="comm-members">
                      <Users size={16} />
                      <span>{comm.memberCount} Members</span>
                    </div>
                    <div className="comm-actions">
                      {currentUser?.id === comm.creatorId && (
                        <button 
                          className="delete-comm-btn"
                          onClick={() => handleDeleteCommunity(comm.id, comm.name)}
                          title="Delete Community"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <button 
                        className="view-comm-btn"
                        onClick={() => navigate(`/community/${comm.id}`)}
                      >
                        View Group
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {communities.length === 0 && (
                <div className="empty-state">
                  <Users size={48} />
                  <h3>No groups exist</h3>
                  <p>Start a new community to connect with peers.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button className="modal-close" onClick={() => setShowModal(false)}><X size={24} /></button>
            <h2>Create Community</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Community Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Advanced System Design"
                  value={newComm.name}
                  onChange={(e) => setNewComm({...newComm, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  required 
                  rows={4}
                  placeholder="What is this group about?"
                  value={newComm.description}
                  onChange={(e) => setNewComm({...newComm, description: e.target.value})}
                />
              </div>
              <button type="submit" className="submit-btn">Create Group</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityPage;
