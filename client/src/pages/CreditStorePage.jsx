import React, { useState, useEffect } from 'react';
import { api, getUser } from '../services/api';
import { Store, Star, Shield, Zap, BookOpen, Crown } from 'lucide-react';
import './CreditStorePage.css';

const STORE_ITEMS = [
  { id: 'profile_highlight', name: 'Profile Highlight', description: 'Highlight your profile in search results for 7 days to get more session requests.', price: 150, icon: Star },
  { id: 'premium_badge', name: 'Premium Learner Badge', description: 'Showcase your dedication with a permanent premium badge on your profile.', price: 500, icon: Crown },
  { id: 'fast_verify', name: 'Priority Verification', description: 'Skip the line and get your certifications verified within 24 hours.', price: 300, icon: Shield },
  { id: 'bump_feed', name: 'Bump Achievement', description: 'Push your latest achievement to the top of the community feed.', price: 50, icon: Zap },
  { id: 'exclusive_groups', name: 'Elite Community Access', description: 'Gain lifetime access to elite, high-reputation community groups.', price: 800, icon: BookOpen },
];

const CreditStorePage = () => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const fetchWallet = async () => {
    try {
      const res = await api.getWallet();
      setBalance(res.wallet.balance);
    } catch (err) {
      console.error('Failed to fetch wallet for store');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleBuy = async (item) => {
    if (balance < item.price) {
      setMessage({ type: 'error', text: 'Insufficient credits!' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      // Assuming api.spendCredits is exported
      const res = await fetch(`${import.meta.env.VITE_API_URL}/credits/spend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ itemId: item.id, amount: item.price, description: item.name })
      }).then(r => r.json());

      if (res.wallet) {
        setBalance(res.wallet.balance);
        setMessage({ type: 'success', text: `Successfully purchased ${item.name}!` });
      } else {
        setMessage({ type: 'error', text: res.message || 'Purchase failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error processing purchase.' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) return <div className="p-8">Loading store...</div>;

  return (
    <div className="store-container">
      <header className="store-header">
        <h1>Credit Exchange</h1>
        <p>Redeem your hard-earned credits for exclusive platform perks.</p>
      </header>

      {message && (
        <div className="success-message" style={message.type === 'error' ? { background: '#fce8e6', color: '#c5221f', borderColor: '#fad2cf' } : {}}>
          {message.text}
        </div>
      )}

      <div className="wallet-balance-card">
        <div className="balance-info">
          <h3>Available Credits</h3>
          <div className="balance-amount">
            <Store size={28} />
            {balance}
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>Earn more credits by teaching others!</p>
      </div>

      <div className="store-grid">
        {STORE_ITEMS.map((item) => (
          <div className="store-item-card" key={item.id}>
            <div className="item-icon">
              <item.icon size={24} />
            </div>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <div className="item-footer">
              <span className="item-cost">{item.price} Credits</span>
              <button 
                className="buy-btn" 
                disabled={balance < item.price}
                onClick={() => handleBuy(item)}
              >
                {balance < item.price ? 'Not Enough' : 'Purchase'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreditStorePage;
