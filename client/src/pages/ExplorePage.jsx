import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Star, TrendingUp, Clock,
  MapPin, CheckCircle, ChevronDown, SlidersHorizontal
} from 'lucide-react';
import './ExplorePage.css';

const CustomSelect = ({ value, onChange, options, label, width = '100px' }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="custom-select-container" style={{ width }}>
      <button 
        className="btn-outline filter-btn custom-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {selectedOption.label === 'All' || selectedOption.label === 'Level' ? label : selectedOption.label}
        <ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="custom-select-overlay" onClick={() => setIsOpen(false)} />
          <ul className="custom-select-options">
            {options.map((opt) => (
              <li 
                key={opt.value}
                className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

const ExplorePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [selectedLevel, setSelectedLevel] = useState('All');
  const [sortBy, setSortBy] = useState('recommended');

  const resetFilters = () => {
    setSearchQuery('');
    setActiveTab('All');
    setMinRating(0);
    setMaxPrice(1000);
    setSelectedLevel('All');
    setSortBy('recommended');
  };

  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for UI presentation categories
  const categories = ['All', 'Programming', 'Design', 'Marketing', 'Business', 'Languages'];
  const trendingSkills = ['React.js', 'Python', 'UI/UX Design', 'Data Science', 'SEO', 'AWS'];

  useEffect(() => {
    const fetchMentors = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/users/search`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        setMentors(data.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMentors();
  }, []);

  const filteredMentors = mentors.filter(mentor => {
    // 1. Search Query Match (by name or skills)
    const searchLower = searchQuery.toLowerCase();
    
    // Safety check for skills (Sequelize getter returns array, but API might return string)
    const rawSkills = mentor.skillsOffered || [];
    const skillsArray = Array.isArray(rawSkills) ? rawSkills : String(rawSkills).split(',');
    
    const matchesSearch = !searchQuery ||
      (mentor.fullName || '').toLowerCase().includes(searchLower) ||
      (mentor.bio && mentor.bio.toLowerCase().includes(searchLower)) ||
      skillsArray.some(skill => String(skill).toLowerCase().includes(searchLower));

    // 2. Rating Match
    const matchesRating = (Number(mentor.averageRating) || 0) >= minRating;

    // 3. Tab (Category) Match
    const matchesTab = activeTab === 'All' || 
      skillsArray.some(skill => String(skill).toLowerCase().includes(activeTab.toLowerCase())) ||
      (mentor.bio && mentor.bio.toLowerCase().includes(activeTab.toLowerCase()));

    // 4. Level Match
    let matchesLevel = true;
    if (selectedLevel !== 'All') {
      const lvl = mentor.level || 1;
      if (selectedLevel === 'Beginner') matchesLevel = lvl === 1;
      else if (selectedLevel === 'Intermediate') matchesLevel = lvl >= 2 && lvl <= 4;
      else if (selectedLevel === 'Advanced') matchesLevel = lvl >= 5;
    }

    // 5. Price Match (Assuming mentor costs 500 and user costs 0)
    const dummyCost = mentor.role === 'mentor' ? 500 : 0;
    const matchesPrice = dummyCost <= maxPrice;

    return matchesSearch && matchesRating && matchesTab && matchesLevel && matchesPrice;
  });

  const sortedMentors = [...filteredMentors].sort((a, b) => {
    if (sortBy === 'highest_rated') {
      return (Number(b.averageRating) || 0) - (Number(a.averageRating) || 0);
    } else if (sortBy === 'highest_level') {
      return (Number(b.level) || 1) - (Number(a.level) || 1);
    }
    // recommended: sort by reputation score
    return (Number(b.reputationScore) || 0) - (Number(a.reputationScore) || 0);
  });

  return (
    <>

        {/* Header Section */}
        <header className="explore-header">
          <div className="explore-title">
            <h1>Discover & Connect</h1>
            <p>Find the perfect mentor, learn new skills, or get your code reviewed.</p>
          </div>

          <div className="search-bar-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search mentors, skills, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button className="btn-primary search-btn">Search</button>
          </div>
        </header>

        {/* Filters and Tabs */}
        <div className="explore-controls">
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`tab-btn ${activeTab === cat ? 'active' : ''}`}
                onClick={() => setActiveTab(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="filter-actions">
            <CustomSelect 
              label="Ratings"
              value={minRating}
              onChange={setMinRating}
              options={[
                { value: 0, label: 'Ratings' },
                { value: 4.5, label: '4.5 & up' },
                { value: 4.8, label: '4.8 & up' }
              ]}
              width="100px"
            />

            <CustomSelect 
              label="Credits"
              value={maxPrice}
              onChange={setMaxPrice}
              options={[
                { value: 1000, label: 'Credits' },
                { value: 300, label: 'Under 300 SC' },
                { value: 400, label: 'Under 400 SC' }
              ]}
              width="100px"
            />

            <CustomSelect 
              label="Level"
              value={selectedLevel}
              onChange={setSelectedLevel}
              options={[
                { value: 'All', label: 'Level' },
                { value: 'Beginner', label: 'Beginner' },
                { value: 'Intermediate', label: 'Intermediate' },
                { value: 'Advanced', label: 'Advanced' }
              ]}
              width="100px"
            />

            <CustomSelect 
              label="Sort By"
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'recommended', label: 'Sort By' },
                { value: 'highest_rated', label: 'Highest Rated' },
                { value: 'highest_level', label: 'Highest Level' }
              ]}
              width="120px"
            />

            <button 
              className="btn-outline filter-btn icon-only" 
              onClick={resetFilters}
              title="Reset Filters"
              style={{ width: '40px', height: '40px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <SlidersHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* Trending Section */}
        <section className="trending-section">
          <h3><TrendingUp size={18} /> Trending Skills</h3>
          <div className="trending-tags">
            {trendingSkills.map(skill => (
              <span key={skill} className="trending-tag">{skill}</span>
            ))}
          </div>
        </section>

        <section className="directory-section">
          <div className="directory-header">
            <h3>Recommended Mentors</h3>
            <span className="results-count">Showing {sortedMentors.length} results</span>
          </div>

          <div className="mentor-grid">
            {sortedMentors.length === 0 ? (
              <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>No mentors found matching your criteria.</div>
            ) : (
              sortedMentors.map(mentor => (
                <div
                  key={mentor.id}
                  className="mentor-card"
                  onClick={() => navigate(`/user/${mentor.id}`)}
                >
                  <div className="mentor-card-header">
                    <div className="mentor-avatar">{(mentor.fullName?.[0] || '?').toUpperCase()}</div>
                    <div className="mentor-price">
                      <span className="price-val">{mentor.role === 'mentor' ? 'Paid' : 'Free'}</span>
                    </div>
                  </div>

                  <div className="mentor-card-body">
                    <h4 className="mentor-name">
                      {mentor.fullName} {mentor.isVerified && <CheckCircle size={14} className="verified-icon" />}
                      <span className="level-badge">Lvl {mentor.level || 1}</span>
                    </h4>
                    <p className="mentor-title">{mentor.bio || 'Active Member'}</p>

                    <div className="mentor-stats">
                      <span className="stat-rating">
                        <Star size={14} fill="currentColor" color="#F59E0B" />
                        {Number(mentor.averageRating || 0).toFixed(1)}
                      </span>
                      <span className="stat-availability">
                         <Star size={14} /> Score: {mentor.reputationScore || 0}
                      </span>
                    </div>

                    <div className="mentor-skills">
                      {(mentor.skillsOffered ? String(mentor.skillsOffered).split(',') : []).slice(0, 3).map((skill, index) => (
                        <span key={index} className="skill-pill">{skill.trim()}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mentor-card-footer">
                    <button className="btn-outline full-width">View Profile</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

    </>
  );
};

export default ExplorePage;
