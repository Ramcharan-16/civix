import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, ArrowLeftRight } from 'lucide-react';

interface LoginProps {
  isOfficial: boolean;
  onSwitchPortal: () => void;
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ isOfficial, onSwitchPortal, onSwitchToRegister }) => {
  const { login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setError(null);
    setLoading(true);

    try {
      const loggedUser = await login(email, password);
      
      // Portal role-based checks
      if (isOfficial) {
        if (loggedUser.role === 'CITIZEN') {
          logout();
          setError('This login portal is restricted to municipal officials and staff. Please use the Citizen Portal.');
        }
      } else {
        if (loggedUser.role !== 'CITIZEN') {
          logout();
          setError('This login portal is reserved for citizens. Please use the Officials Portal to sign in.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: isOfficial
                ? 'linear-gradient(135deg, var(--accent-color), var(--warning-color))'
                : 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.6rem',
              color: 'white',
              fontWeight: 800,
              marginBottom: '16px'
            }}
          >
            {isOfficial ? '🏛️' : '🏠'}
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.5px', color: 'white' }}>
            {isOfficial ? 'Civix Officials Portal' : 'Civix Citizen Portal'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            {isOfficial
              ? 'Sign in to manage municipal assets, verify reports, and dispatch field workers.'
              : 'Sign in to lodge complaints & track civic issues in real-time.'}
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              lineHeight: 1.4
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address or Mobile Number</label>
            <input
              type="text"
              placeholder={isOfficial ? 'e.g. admin@civix.gov.in or 9876543210' : 'e.g. citizen@gmail.com or +91 98765 43210'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              marginTop: '8px',
              background: isOfficial ? 'linear-gradient(135deg, var(--accent-color), var(--primary-color))' : undefined 
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            {!loading && <LogIn size={18} />}
          </button>
        </form>

        {/* Portal Switch and Registration links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px', textAlign: 'center' }}>
          <button
            onClick={onSwitchPortal}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-color)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 0',
              transition: 'color 0.2s'
            }}
          >
            <ArrowLeftRight size={14} />
            {isOfficial ? 'Are you a resident? Go to Citizen Portal' : 'Are you an official? Go to Officials Portal'}
          </button>

          {isOfficial ? (
            <div style={{ marginTop: '4px' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                New municipal official?
              </p>
              <button
                onClick={onSwitchToRegister}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '10px' }}
              >
                <UserPlus size={16} />
                Register Official Account
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '4px' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                New to the community portal?
              </p>
              <button
                onClick={onSwitchToRegister}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '10px' }}
              >
                <UserPlus size={16} />
                Create Citizen Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
