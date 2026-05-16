import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Calendar, MessageSquare, Trash2 } from 'lucide-react';
import api, { getUser } from '../services/api';
import './CommunityDetailsPage.css';

const CommunityDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const currentUser = getUser();

  const fetchDetails = async () => {
    try {
      const res = await api.getCommunityDetails(id);
      setCommunity(res.community);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const handleJoin = async () => {
    try {
      await api.joinCommunity(id);
      fetchDetails();
    } catch (error) {
      alert(error.message || 'Error joining community');
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    try {
      await api.sendMessage({ sessionId: id, content: newPost }); // Assuming createPost in api service maps to community posts
      // Wait, let's check if api has createPost. No, it doesn't.
      // I should add it or use raw fetch if specific.
      // Actually, I'll use raw fetch for community posts as it's specific to this sub-route.
      await fetch(`${import.meta.env.VITE_API_URL}/community/${id}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ content: newPost })
      });
      setNewPost('');
      fetchDetails();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${community.name}"? This action cannot be undone.`)) return;
    try {
      await api.deleteCommunity(id);
      navigate('/community');
    } catch (err) {
      alert(err.message || 'Error deleting community');
    }
  };

  if (loading || !community) return <div className="p-8 text-center">Loading community details...</div>;

  const members = community.communityMemberships || [];
  const posts = community.posts || [];
  const isMember = members.some(m => m.userId === currentUser?.id);
  const leaders = members.filter(m => m.role === 'leader');
  const isCreator = community.creatorId === currentUser?.id;

  return (
    <div className="comm-details-container">
      <div className="comm-banner">
        <div className="comm-banner-header">
          <div className="comm-title">
            <h1>{community.name}</h1>
            <div className="comm-meta">
              <span><Users size={16}/> {community.memberCount} Members</span>
              <span><Calendar size={16}/> Created {new Date(community.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="comm-banner-actions">
            {isCreator && (
              <button className="delete-comm-btn-large" onClick={handleDelete}>
                <Trash2 size={18}/> Delete Community
              </button>
            )}
            <button 
              className="join-comm-btn"
              disabled={isMember}
              onClick={handleJoin}
            >
              {isMember ? 'Joined' : 'Join Community'}
            </button>
          </div>
        </div>
        <p className="comm-description">{community.description}</p>
      </div>

      <div className="comm-content">
        <div className="discussion-section">
          <h2 className="section-header">Discussion <MessageSquare size={20} style={{display:'inline', marginLeft:'0.5rem'}}/></h2>
          
          {isMember ? (
            <form className="write-post" onSubmit={handlePost}>
              <textarea 
                placeholder="Share knowledge, ask a question, or introduce yourself..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                required
              />
              <button type="submit" className="post-btn">Post to Community</button>
            </form>
          ) : (
            <div className="join-notice">
              Join the community to post in the discussion!
            </div>
          )}

          <div className="posts-list">
            {posts.length > 0 ? posts.map(post => (
              <div className="post-card" key={post.id}>
                <div className="post-header">
                  <div className="post-avatar">
                    {post.author?.fullName?.[0]}
                  </div>
                  <div className="post-meta">
                    <h4>{post.author?.fullName || 'User'}</h4>
                    <span>{new Date(post.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="post-content">
                  {post.content}
                </div>
              </div>
            )) : (
              <p className="empty-posts">No discussions yet. Be the first to start one!</p>
            )}
          </div>
        </div>

        <div className="members-section">
          <h2 className="section-header">Leadership</h2>
          <div className="members-list">
            {leaders.map(member => (
              <div className="member-item" key={member.id}>
                <div className="member-avatar">
                  {member.user?.fullName?.[0]}
                </div>
                <div className="member-info">
                  <h4>{member.user?.fullName}</h4>
                  <span className="role-badge leader">Leader</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityDetailsPage;
