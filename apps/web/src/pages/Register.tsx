import React, { useState, useRef } from 'react';
import { useAuth, Role } from '../context/AuthContext';
import { City3DCanvas } from '../components/City3DCanvas';
import { 
  LogIn, 
  UserPlus, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  Briefcase, 
  Radio, 
  ShieldCheck 
} from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('STAFF');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 3D Card tilt on hover
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardTransform, setCardTransform] = useState('');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;

    setCardTransform(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`);
  };

  const handleMouseLeave = () => {
    setCardTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)');
  };

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
        position: 'relative',
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px 20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: isOfficial
          ? 'radial-gradient(circle at 50% 40%, #150d06 0%, #080402 100%)'
          : 'radial-gradient(circle at 50% 40%, #091322 0%, #030712 100%)'
      }}
    >
      {/* Three.js 3D Digital Twin City Background */}
      <City3DCanvas isOfficial={isOfficial} />

      {/* Perspective Wrap */}
      <div className="auth-perspective-wrap animate-fade-in" style={{ maxWidth: '490px' }}>
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`auth-glass-card ${isOfficial ? 'official-theme' : ''}`}
          style={{
            transform: cardTransform || undefined,
          }}
        >
          {/* Ambient Glow */}
          <div className={`auth-card-halo ${isOfficial ? 'official' : 'citizen'}`} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '22px', position: 'relative' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 14px',
                borderRadius: '20px',
                background: isOfficial ? 'rgba(245, 158, 11, 0.12)' : 'rgba(6, 182, 212, 0.12)',
                border: isOfficial ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(6, 182, 212, 0.3)',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: isOfficial ? '#f59e0b' : '#06b6d4',
                  boxShadow: isOfficial ? '0 0 8px #f59e0b' : '0 0 8px #06b6d4',
                }}
              />
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  color: isOfficial ? '#fbbf24' : '#38bdf8',
                }}
              >
                {isOfficial ? 'Civix Municipal Administration' : 'Civix Community Network'}
              </span>
            </div>

            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                margin: '0 0 6px 0',
                letterSpacing: '-0.5px',
                color: '#f8fafc',
              }}
            >
              {isOfficial ? 'Join Municipal Fleet' : 'Create Citizen Account'}
            </h1>
            <p
              style={{
                fontSize: '0.86rem',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              {isOfficial
                ? 'Register municipal official credentials for ward telemetry & assignment dispatch.'
                : 'Join your neighborhood network to resolve civic issues & track municipal SLA.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="animate-fade-in"
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.28)',
                color: '#fca5a5',
                fontSize: '0.84rem',
                lineHeight: 1.4,
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Full Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
              <div className={`auth-input-wrapper ${isOfficial ? 'official' : ''}`}>
                <User size={16} className="leading-icon" />
                <input
                  type="text"
                  placeholder={isOfficial ? 'e.g. Officer Ramesh Kumar' : 'e.g. Aarav Mehta'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
              <div className={`auth-input-wrapper ${isOfficial ? 'official' : ''}`}>
                <Mail size={16} className="leading-icon" />
                <input
                  type="email"
                  placeholder={isOfficial ? 'e.g. officer@civix.gov.in' : 'e.g. aarav.mehta@gmail.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* WhatsApp Mobile */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  WhatsApp Mobile Number
                </label>
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>💬 Real-Time Alerts</span>
              </div>
              <div className={`auth-input-wrapper ${isOfficial ? 'official' : ''}`}>
                <Phone size={16} className="leading-icon" />
                <input
                  type="tel"
                  placeholder="e.g. 9876543210 or +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Municipal Role (if Official) */}
            {isOfficial && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Municipal Role & Assignment
                </label>
                <div className="auth-input-wrapper official">
                  <Briefcase size={16} className="leading-icon" />
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as Role)}
                    style={{
                      width: '100%',
                      paddingLeft: '42px',
                      paddingRight: '16px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '0.9rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="STAFF" style={{ backgroundColor: '#0f172a' }}>Field Staff / Officer</option>
                    <option value="DEPARTMENT_ADMIN" style={{ backgroundColor: '#0f172a' }}>Department Administrator</option>
                  </select>
                </div>
              </div>
            )}

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Password</label>
              <div className={`auth-input-wrapper ${isOfficial ? 'official' : ''}`}>
                <Lock size={16} className="leading-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-password-toggle"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                marginTop: '10px',
                borderRadius: '12px',
                fontSize: '0.92rem',
                fontWeight: 700,
                letterSpacing: '0.3px',
                color: 'white',
                background: isOfficial
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'linear-gradient(135deg, #06b6d4, #2563eb)',
                boxShadow: isOfficial
                  ? '0 6px 20px rgba(245, 158, 11, 0.4)'
                  : '0 6px 20px rgba(6, 182, 212, 0.4)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {loading ? (
                'Registering Identity in Municipal Ledger...'
              ) : (
                <>
                  <span>Create {isOfficial ? 'Official Account' : 'Citizen Account'}</span>
                  <UserPlus size={18} />
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div
            style={{
              marginTop: '22px',
              paddingTop: '18px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Already registered in the Civix database?
            </p>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                fontSize: '0.84rem',
              }}
            >
              <LogIn size={15} />
              Sign In Instead
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Bar */}
      <div style={{ marginTop: '20px', zIndex: 10 }}>
        <div className="auth-telemetry-badge">
          <Radio size={13} color={isOfficial ? '#fbbf24' : '#38bdf8'} />
          <span>Municipal Gateway Ready</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <ShieldCheck size={13} color="#10b981" />
          <span>Zero-Knowledge Secure Encryption</span>
        </div>
      </div>
    </div>
  );
};
