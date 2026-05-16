import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, Clock, CheckCircle, Shield, Briefcase } from 'lucide-react';
import './RecruiterPage.css';

const RecruiterPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ skill: '', minRating: '0' });
  const navigate = useNavigate();

  const fetchTalent = async () => {
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/talent?${query}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTalent();
  }, [filters]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="recruiter-container">
      <div className="recruiter-header">
        <h1>Talent Discovery <Briefcase size={28} style={{display:'inline', marginLeft:'0.5rem'}}/></h1>
        <p>Hire based on proven platform metrics, not just resumes. "Proof of Skill" rankings.</p>
      </div>

      <div className="filter-bar">
        <div className="filter-item">
          <label><Search size={14} style={{display:'inline', marginRight:'0.25rem'}}/> Search by Skill</label>
          <input 
            type="text" 
            name="skill" 
            placeholder="e.g. React, Node.js" 
            value={filters.skill} 
            onChange={handleFilterChange} 
          />
        </div>
        <div className="filter-item">
          <label><Star size={14} style={{display:'inline', marginRight:'0.25rem'}}/> Minimum Rating</label>
          <select name="minRating" value={filters.minRating} onChange={handleFilterChange}>
            <option value="0">All Ratings</option>
            <option value="4">4.0 & Above</option>
            <option value="4.5">4.5 & Above</option>
            <option value="4.8">4.8 & Above</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-8">Loading elite candidates...</div>
      ) : (
        <div className="talent-grid">
          {candidates.map(candidate => (
            <div className="talent-card" key={candidate.id}>
              <div className="proof-score-badge">
                <Star size={16} fill="white" /> score: {candidate.reputationScore}
              </div>
              
              <div className="talent-header">
                <img src={candidate.profilePicture ? (candidate.profilePicture?.startsWith('http') ? candidate.profilePicture : `${import.meta.env.VITE_API_URL.replace('/api', '')}${candidate.profilePicture}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.fullName)}&background=000000&color=ffffff`} alt={candidate.fullName} className="talent-avatar" />
                <div className="talent-info">
                  <h3>
                    {candidate.fullName}
                    {candidate.isVerified && <CheckCircle size={18} color="#10b981" />}
                  </h3>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {candidate.role === 'mentor' ? 'Certified Mentor' : 'Active Learner'}
                  </span>
                </div>
              </div>

              <div className="talent-metrics">
                <div className="metric">
                  <span className="metric-val">{Number(candidate.averageRating || 0).toFixed(1)}</span>
                  <span className="metric-label">Avg Rating</span>
                </div>
                <div className="metric">
                  <span className="metric-val">{candidate.totalHoursTaught || 0}h</span>
                  <span className="metric-label">Taught</span>
                </div>
                <div className="metric">
                  <span className="metric-val">{candidate.sessionsCompleted || 0}</span>
                  <span className="metric-label">Sessions</span>
                </div>
              </div>

              <div className="talent-skills">
                {candidate.skillsOffered && (Array.isArray(candidate.skillsOffered) ? candidate.skillsOffered : String(candidate.skillsOffered).split(',')).slice(0, 4).map((skill, index) => (
                  <span className="skill-tag" key={index}>{String(skill).trim()}</span>
                ))}
              </div>

              <div className="action-buttons">
                <button 
                  className="view-btn"
                  onClick={() => navigate(`/user/${candidate.id}`)}
                >
                  View Full Profile
                </button>
                <button 
                  className="contact-btn"
                  onClick={() => window.location.href = `mailto:${candidate.email}`}
                >
                  Contact Direct
                </button>
              </div>
            </div>
          ))}
          {candidates.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              No candidates found matching your specific criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecruiterPage;
