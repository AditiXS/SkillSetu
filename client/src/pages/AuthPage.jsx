import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Mail, Lock, User, BookOpen, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { api, saveAuth } from '../services/api';
import './AuthPage.css';

const AuthPage = () => {
  // mode can be: 'login', 'register', 'forgot', 'reset'
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form state
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    skillsOffered: '',
    skillsWanted: '',
  });

  useEffect(() => {
    const resetToken = searchParams.get('reset');
    if (resetToken) {
      setMode('reset');
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setMessage('');
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        const result = await api.login({ email: form.email, password: form.password });
        if (result.token) {
          saveAuth(result.token, result.user);
          navigate('/dashboard');
        }
      } else if (mode === 'register') {
        const result = await api.register({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          skillsOffered: form.skillsOffered,
          skillsWanted: form.skillsWanted,
        });
        if (result.token) {
          saveAuth(result.token, result.user);
          navigate('/dashboard');
        }
      } else if (mode === 'forgot') {
        const result = await api.forgotPassword({ email: form.email });
        setMessage(result.message || 'Check your email for the reset link.');
      } else if (mode === 'reset') {
        const token = searchParams.get('reset');
        const result = await api.resetPassword({ token, newPassword: form.password });
        setMessage(result.message || 'Password updated! You can now log in.');
        setTimeout(() => setMode('login'), 3000);
      }
    } catch (err) {
      if (mode === 'login' && err.status === 404) {
        window.alert("You don't have an account. Please create one!");
        setMode('register');
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      if (!auth) {
        throw new Error("Google Login is not configured on this server. Please sign in with email/password.");
      }
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      const serverResult = await api.firebaseLogin({ idToken });
      
      if (serverResult.token) {
        saveAuth(serverResult.token, serverResult.user);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.message || 'Google sign-in failed. Please try again.');
    }
  };

  const getHeaderTexts = () => {
    switch (mode) {
      case 'login': return { title: 'Welcome back', subtitle: 'Sign in to continue your learning journey' };
      case 'register': return { title: 'Create your account', subtitle: 'Start exchanging skills with the community' };
      case 'forgot': return { title: 'Reset Password', subtitle: "Enter your email and we'll send you a link" };
      case 'reset': return { title: 'New Password', subtitle: 'Enter your new password below' };
      default: return { title: '', subtitle: '' };
    }
  };

  const { title, subtitle } = getHeaderTexts();

  return (
    <div className="auth-page">
      {/* Left Panel — Branding */}
      <div className="auth-branding">
        <div className="auth-branding-content">
          <div className="auth-logo">
            <GraduationCap size={32} />
            <span>SkillSetu</span>
          </div>
          <h1>
            Exchange Skills,<br />
            <span className="auth-highlight">Not Money.</span>
          </h1>
          <p>
            Join a community where knowledge is the only currency.
            Teach, learn, and grow — together.
          </p>
          <div className="auth-stats-row">
            <div className="auth-stat">
              <strong>2,400+</strong>
              <span>Learners</span>
            </div>
            <div className="auth-stat">
              <strong>180+</strong>
              <span>Skills</span>
            </div>
            <div className="auth-stat">
              <strong>₹0</strong>
              <span>Cost</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success" style={{ padding: '0.85rem 1.25rem', borderRadius: '4px', background: '#e6f4ea', color: '#137333', fontSize: '0.9rem', marginBottom: '1.5rem', border: '1px solid #ceead6' }}>{message}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <div className="input-wrapper">
                  <User size={18} />
                  <input id="fullName" name="fullName" type="text" placeholder="Your full name" value={form.fullName} onChange={handleChange} required />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-wrapper">
                  <Mail size={18} />
                  <input id="email" name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <Lock size={18} />
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={handleChange} required minLength={6} />
                  <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {mode === 'login' && (
                  <div style={{ textAlign: 'right', marginTop: '4px' }}>
                    <button type="button" onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
                      Forgot Password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label htmlFor="skillsOffered">Skills You Can Teach</label>
                  <div className="input-wrapper">
                    <BookOpen size={18} />
                    <input id="skillsOffered" name="skillsOffered" type="text" placeholder="e.g. Python, React, Guitar" value={form.skillsOffered} onChange={handleChange} />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="skillsWanted">Skills You Want to Learn</label>
                  <div className="input-wrapper">
                    <BookOpen size={18} />
                    <input id="skillsWanted" name="skillsWanted" type="text" placeholder="e.g. UI/UX, Data Science" value={form.skillsWanted} onChange={handleChange} />
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Please wait...' : (
                mode === 'login' ? 'Sign In' :
                mode === 'register' ? 'Create Account' :
                mode === 'forgot' ? 'Send Reset Link' :
                'Update Password'
              )}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {(mode === 'login' || mode === 'register') && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }}></div>
                <span style={{ margin: '0 10px', color: '#888', fontSize: '0.9rem' }}>— OR —</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e0e0e0' }}></div>
              </div>
              <button 
                type="button" 
                onClick={handleGoogleLogin} 
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '1.5rem',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fff'}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', marginRight: '10px' }} />
                Continue with Google
              </button>
            </>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div className="auth-toggle">
              <p>
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                <button type="button" onClick={toggleMode} className="toggle-link">
                  {mode === 'login' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <div className="auth-toggle">
              <p>
                Remember your password?
                <button type="button" onClick={() => setMode('login')} className="toggle-link">
                  Back to Sign In
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
