import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, MapPin, Clock, Award, CheckCircle, Send, ArrowLeft, Briefcase } from 'lucide-react';
import api from '../services/api';
import './UserProfilePage.css';

const UserProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({ topic: '', description: '', duration: 60, scheduledDate: '' });
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  // Returns the current date-time string in "YYYY-MM-DDTHH:MM" format (local time)
  // Used as the `min` value for the datetime-local input so past times are greyed out
  const getMinDateTime = () => {
    const now = new Date();
    // Strip seconds and milliseconds for comparison
    now.setSeconds(0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await api.getUserProfile(id);
        setUser(data.user);
        setRatings(data.ratings || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  const handleSendRequest = async (e) => {
    e.preventDefault();

    // Safely parse "YYYY-MM-DDTHH:mm" into local timezone
    const [datePart, timePart] = requestForm.scheduledDate.split('T');
    const [year, month, day] = datePart.split('-');
    const [hours, minutes] = timePart.split(':');
    const selected = new Date(year, month - 1, day, hours, minutes);

    const now = new Date();
    // Strip seconds and milliseconds from both for a fair comparison
    selected.setSeconds(0, 0);
    now.setSeconds(0, 0);

    if (selected < now) {
      setMessage('⚠️ Cannot schedule a session in the past. Please pick a current or future time.');
      return;
    }

    setSending(true);
    try {
      await api.createSessionRequest({
        receiverId: parseInt(id),
        topic: requestForm.topic,
        description: requestForm.description,
        duration: parseInt(requestForm.duration),
        scheduledDate: selected.toISOString(), // Send as strict UTC instead of local string
      });
      setMessage('Session request sent successfully!');
      setShowRequestForm(false);
      setRequestForm({ topic: '', description: '', duration: 60, scheduledDate: '' });
    } catch (err) {
      setMessage(err.response?.data?.message || err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="up-loading"><div className="up-spinner"></div></div>;
  if (!user) return <div className="up-loading">User not found</div>;

  const initials = user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  return (
    <div className="up-container">
      <button className="up-back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>

      {message && <div className="up-toast">{message}</div>}

      <div className="up-hero">
        <div className="up-hero-left">
          <div className="up-avatar-large">
            {user.profilePicture ? (
              <img src={(user.profilePicture?.startsWith('http') ? user.profilePicture : `${import.meta.env.VITE_API_URL.replace('/api', '')}${user.profilePicture}`)} alt={user.fullName} />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="up-hero-info">
            <div className="up-name-row">
              <h1>{user.fullName}</h1>
              {user.isVerified && <CheckCircle size={20} className="up-verified" />}
              {user.role === 'mentor' && <span className="up-role-badge">Mentor</span>}
            </div>
            <p className="up-bio">{user.bio || 'No bio yet'}</p>
            <div className="up-quick-stats">
              <div className="up-stat">
                <Star size={16} /> <strong>{user.averageRating?.toFixed(1) || '0.0'}</strong>
              </div>
              <div className="up-stat">
                <Briefcase size={16} /> <strong>{user.sessionsCompleted || 0}</strong> sessions
              </div>
              <div className="up-stat">
                <Clock size={16} /> <strong>{user.totalHoursTaught?.toFixed(0) || 0}</strong>h taught
              </div>
              <div className="up-stat">
                <Award size={16} /> Level {user.level || 1}
              </div>
            </div>
          </div>
        </div>
        <div className="up-hero-right">
          <button className="up-connect-btn" onClick={() => setShowRequestForm(!showRequestForm)}>
            <Send size={16} /> {showRequestForm ? 'Cancel' : 'Connect'}
          </button>
        </div>
      </div>

      {showRequestForm && (
        <div className="up-request-form-card">
          <h3>Request a Session</h3>
          <form onSubmit={handleSendRequest}>
            <div className="up-form-row">
              <div className="up-form-group">
                <label>Topic</label>
                <input type="text" placeholder="What do you want to learn?" value={requestForm.topic} onChange={e => setRequestForm({...requestForm, topic: e.target.value})} required />
              </div>
              <div className="up-form-group">
                <label>Duration (min)</label>
                <select value={requestForm.duration} onChange={e => setRequestForm({...requestForm, duration: e.target.value})}>
                  <option value={30}>30 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                  <option value={120}>120 min</option>
                </select>
              </div>
            </div>
            <div className="up-form-group">
              <label>Scheduled Date & Time</label>
              <input
                type="datetime-local"
                value={requestForm.scheduledDate}
                min={getMinDateTime()}
                onChange={e => setRequestForm({...requestForm, scheduledDate: e.target.value})}
                required
              />
            </div>
            <div className="up-form-group">
              <label>Description (optional)</label>
              <textarea placeholder="Describe what you'd like to cover..." value={requestForm.description} onChange={e => setRequestForm({...requestForm, description: e.target.value})} rows={3} />
            </div>
            <button type="submit" className="up-submit-btn" disabled={sending}>
              {sending ? 'Sending...' : 'Send Request'}
            </button>
          </form>
        </div>
      )}

      <div className="up-sections">
        <div className="up-section">
          <h2>Skills Offered</h2>
          <div className="up-skills-list">
            {(user.skillsOffered || []).length > 0 ? user.skillsOffered.map((s, i) => (
              <span key={i} className="up-skill-tag offered">{s}</span>
            )) : <p className="up-empty">No skills listed</p>}
          </div>
        </div>
        <div className="up-section">
          <h2>Skills Wanted</h2>
          <div className="up-skills-list">
            {(user.skillsWanted || []).length > 0 ? user.skillsWanted.map((s, i) => (
              <span key={i} className="up-skill-tag wanted">{s}</span>
            )) : <p className="up-empty">No skills listed</p>}
          </div>
        </div>
      </div>

      {user.badges && user.badges.length > 0 && (
        <div className="up-section">
          <h2>Badges</h2>
          <div className="up-badges-grid">
            {user.badges.map(b => (
              <div key={b.id} className="up-badge-card">
                <span className="up-badge-icon">{b.icon}</span>
                <div>
                  <strong>{b.name}</strong>
                  <p>{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ratings.length > 0 && (
        <div className="up-section">
          <h2>Reviews ({ratings.length})</h2>
          <div className="up-reviews-list">
            {ratings.map(r => (
              <div key={r.id} className="up-review-card">
                <div className="up-review-header">
                  <strong>{r.rater?.fullName || 'Anonymous'}</strong>
                  <div className="up-review-stars">
                    {[1,2,3,4,5].map(s => <Star key={s} size={14} fill={s <= r.overallRating ? '#111' : 'none'} stroke="#111" />)}
                    <span>{r.overallRating?.toFixed(1)}</span>
                  </div>
                </div>
                {r.review && <p>{r.review}</p>}
                <span className="up-review-date">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfilePage;
