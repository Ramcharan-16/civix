import React, { useState } from 'react';
import { useAuth, Role } from '../context/AuthContext';
import { LogIn, UserPlus } from 'lucide-react';

interface RegisterProps {
  isOfficial: boolean;
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ isOfficial, onSwitchToLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('STAFF');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) return;

    setError(null);
    setLoading(true);

    try {
      await register(
        name,
        email,
        phone,
        password,
        isOfficial ? selectedRole : 'CITIZEN'
      );
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check inputs.');
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
          maxWidth: '460px',
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
            {isOfficial ? 'Join Civix Officials' : 'Join Civix'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            {isOfficial
              ? 'Register a new official municipal account to access work queues and manage assets.'
              : 'Register to participate in community governance and resolve infrastructure bugs.'}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
            <input
              type="text"
              placeholder={isOfficial ? 'e.g. Inspector Ramesh' : 'e.g. Aarav Mehta'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
            <input
              type="email"
              placeholder={isOfficial ? 'e.g. officer@civix.gov.in' : 'e.g. aarav@gmail.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>WhatsApp Mobile Number</label>
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>💬 Live WhatsApp Alerts</span>
            </div>
            <input
              type="tel"
              placeholder="e.g. 9876543210 or +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
              Real-time complaint tracking & resolution updates will be sent to this WhatsApp number.
            </span>
          </div>

          {isOfficial && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Municipal Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-glass)',
                  color: 'white',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              >
                <option value="STAFF" style={{ backgroundColor: '#0f172a' }}>Field Staff / Officer</option>
                <option value="DEPARTMENT_ADMIN" style={{ backgroundColor: '#0f172a' }}>Department Administrator</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
              marginTop: '10px',
              background: isOfficial ? 'linear-gradient(135deg, var(--accent-color), var(--primary-color))' : undefined 
            }}
          >
            {loading ? 'Registering...' : 'Register Account'}
            {!loading && <UserPlus size={18} />}
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
            Already have an account?
          </p>
          <button
            onClick={onSwitchToLogin}
            className="btn btn-secondary"
            style={{ width: '100%', padding: '10px' }}
          >
            <LogIn size={16} />
            Sign In Instead
          </button>
        </div>
      </div>
    </div>
  );
};
