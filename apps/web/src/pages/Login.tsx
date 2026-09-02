import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { City3DCanvas } from '../components/City3DCanvas';
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Building2, 
  Users, 
  ShieldCheck, 
  Radio
} from 'lucide-react';

interface LoginProps {
  isOfficial: boolean;
  onSwitchPortal: () => void;
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ isOfficial, onSwitchPortal, onSwitchToRegister }) => {
  const { login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    setCardTransform(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-2px)`);
  };

  const handleMouseLeave = () => {
    setCardTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)');
  };

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
          setError('This login portal is restricted to municipal officials and staff. Please switch to the Citizen Portal.');
        }
      } else {
        if (loggedUser.role !== 'CITIZEN') {
          logout();
          setError('This login portal is reserved for citizens. Please switch to the Officials Portal to sign in.');
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
        position: 'relative',
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: isOfficial
          ? 'radial-gradient(circle at 50% 40%, #150d06 0%, #080402 100%)'
          : 'radial-gradient(circle at 50% 40%, #091322 0%, #030712 100%)'
      }}
    >
      {/* Three.js 3D Digital Twin City Grid Background (Isometric Towers) */}
      <City3DCanvas isOfficial={isOfficial} />

      {/* Main Perspective Container */}
      <div className="auth-perspective-wrap animate-fade-in">
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`auth-glass-card ${isOfficial ? 'official-theme' : ''}`}
          style={{
            transform: cardTransform || undefined,
          }}
        >
          {/* Ambient Corner Glow Halo */}
          <div className={`auth-card-halo ${isOfficial ? 'official' : 'citizen'}`} />

          {/* Top Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px', position: 'relative' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 14px',
                borderRadius: '20px',
                background: isOfficial ? 'rgba(245, 158, 11, 0.12)' : 'rgba(6, 182, 212, 0.12)',
                border: isOfficial ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(6, 182, 212, 0.3)',
                marginBottom: '14px',
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
                Civix Smart City Platform
              </span>
            </div>

            <h1
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                margin: '0 0 6px 0',
                letterSpacing: '-0.5px',
                color: '#f8fafc',
                lineHeight: 1.2,
              }}
            >
              {isOfficial ? 'Municipal Operations' : 'Citizen Civic Portal'}
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
                ? 'Sign in to dispatch ward crews, verify field SLA, & manage assets.'
                : 'Report civic issues, track live ward telemetry & empower your locality.'}
            </p>
          </div>

          {/* Segmented Persona Switcher */}
          <div className="auth-segmented-switch" style={{ marginBottom: '22px' }}>
            <button
              type="button"
              onClick={() => {
                if (isOfficial) onSwitchPortal();
              }}
              className={`auth-role-btn ${!isOfficial ? 'active citizen' : ''}`}
            >
              <Users size={16} />
              Resident Citizen
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isOfficial) onSwitchPortal();
              }}
              className={`auth-role-btn ${isOfficial ? 'active official' : ''}`}
            >
              <Building2 size={16} />
              Municipal Official
            </button>
          </div>

          {/* Error Message */}
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Email / Mobile Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {isOfficial ? 'Official Email / Government ID' : 'Email Address or Mobile Number'}
              </label>
              <div className={`auth-input-wrapper ${isOfficial ? 'official' : ''}`}>
                <Mail size={16} className="leading-icon" />
                <input
                  type="text"
                  placeholder={isOfficial ? 'e.g. admin@civix.gov.in' : 'e.g. aarav.mehta@gmail.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Password
              </label>
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
                'Connecting to Municipal Gateway...'
              ) : (
                <>
                  <span>Sign In to {isOfficial ? 'Officials Desk' : 'Civix'}</span>
                  <LogIn size={18} />
                </>
              )}
            </button>
          </form>

          {/* Footer Registration Action */}
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
              {isOfficial ? 'New official joining the municipal team?' : 'New resident in the municipal ward?'}
            </p>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                fontSize: '0.84rem',
              }}
            >
              <UserPlus size={15} />
              {isOfficial ? 'Join Municipal Team (Field Staff / Dept Admin)' : 'Create Citizen Account'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Live Municipal Telemetry Bar */}
      <div style={{ marginTop: '20px', zIndex: 10 }}>
        <div className="auth-telemetry-badge">
          <Radio size={13} color={isOfficial ? '#fbbf24' : '#38bdf8'} />
          <span>Live Digital Twin Grid: 10 Wards Synchronized</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <ShieldCheck size={13} color="#10b981" />
          <span>GovCloud 256-Bit Encrypted</span>
        </div>
      </div>
    </div>
  );
};
