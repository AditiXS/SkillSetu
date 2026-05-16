import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, Medal, Award, CheckCircle } from 'lucide-react';
import api from '../services/api';
import './LeaderboardPage.css';

const LeaderboardPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getLeaderboard();
        setUsers(data.users || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="lb-loading"><div className="lb-spinner"></div></div>;

  return (
    <div className="lb-container">
      <div className="lb-header">
        <Trophy size={36} color="#f59e0b" className="lb-header-icon" />
        <h1>Top Educators & Learners</h1>
        <p>Ranked by reputation score and contributions</p>
      </div>

      <div className="lb-list">
        {users.map((user, index) => (
          <div key={user.id} className={`lb-card rank-${index + 1}`} onClick={() => navigate(`/user/${user.id}`)}>
            <div className="lb-rank">
              {index === 0 ? <span className="gold"><Trophy size={20}/></span> :
               index === 1 ? <span className="silver"><Medal size={20}/></span> :
               index === 2 ? <span className="bronze"><Medal size={20}/></span> :
               `#${index + 1}`}
            </div>

            <div className="lb-user-info">
              <div className="lb-avatar">
                {user.profilePicture ? <img src={(user.profilePicture?.startsWith('http') ? user.profilePicture : `${import.meta.env.VITE_API_URL.replace('/api', '')}${user.profilePicture}`)} /> : user.fullName[0].toUpperCase()}
              </div>
              <div>
                <h3>{user.fullName} {user.isVerified && <CheckCircle size={14} className="lb-verified"/>}</h3>
                <span className="lb-role">{user.role} · Lvl {user.level || 1}</span>
              </div>
            </div>

            <div className="lb-metrics">
              <div className="lb-metric">
                <Star size={14} /> <strong>{user.averageRating?.toFixed(1) || '0.0'}</strong>
              </div>
              <div className="lb-metric">
                <Award size={14} /> <strong>{user.sessionsCompleted || 0}</strong> sn
              </div>
              <div className="lb-score">
                {user.reputationScore} pt
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardPage;
