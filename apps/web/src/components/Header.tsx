import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, MailOpen, AlertOctagon, ShieldCheck } from 'lucide-react';
import { EmergencySOSModal } from './EmergencySOSModal';
import { CivicCharterModal } from './CivicCharterModal';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  complaintId?: string | null;
}

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setSelectedComplaintId: (id: string | null) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, setSelectedComplaintId }) => {
  const { user, apiFetch } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showCharterModal, setShowCharterModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll every 4 seconds for immediate live updates
      const interval = setInterval(fetchNotifications, 4000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Click outside notification dropdown closes it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: Notification) => {
    try {
      if (!notif.isRead) {
        await apiFetch(`/api/notifications/${notif.id}/read`, { method: 'PUT' });
        // Mark as read locally
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      }
      setShowDropdown(false);

      // Navigate to detail view of complaint if attached
      // We set active tab to citizen-dash / detail and selected id
      // Since staff/admin/citizen have detailed complaint views, we can redirect
      // to a modal or show details tab.
      if (notif.complaintId) {
        setSelectedComplaintId(notif.complaintId);
        setActiveTab('complaint-detail');
      }
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error('Failed to mark all as read:', e);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        marginBottom: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
          {activeTab === 'citizen-dash' && 'Citizen Operations'}
          {activeTab === 'public-complaints' && 'Community Issues Feed'}
          {activeTab === 'create-complaint' && 'Lodge A Complaint'}
          {activeTab === 'staff-dash' && 'Staff Worklist'}
          {activeTab === 'dept-dash' && 'Department Console'}
          {activeTab === 'super-dash' && 'Platform Governance'}
          {activeTab === 'complaint-detail' && 'Complaint File'}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
          Welcome back, {user?.name}. Local Time: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }} ref={dropdownRef}>
        {/* Civic Charter Button */}
        <button
          onClick={() => setShowCharterModal(true)}
          className="btn btn-secondary"
          style={{
            padding: '7px 12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            gap: '6px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            color: '#93c5fd'
          }}
        >
          <ShieldCheck size={14} style={{ color: '#38bdf8' }} />
          SLA Charter
        </button>

        {/* WhatsApp Web Connect Button */}
        <a
          href="/whatsapp/qr"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{
            padding: '7px 12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            gap: '6px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#34d399',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          <span>📱</span>
          WhatsApp QR
        </a>

        {/* Emergency Hazard SOS Button */}
        <button
          onClick={() => setShowSOSModal(true)}
          className="btn btn-danger"
          style={{
            padding: '7px 12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            gap: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            boxShadow: '0 0 12px rgba(239, 68, 68, 0.3)',
            color: '#fff'
          }}
        >
          <AlertOctagon size={14} style={{ color: '#ef4444' }} />
          🚨 Rapid SOS
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => {
            if (!showDropdown) {
              fetchNotifications();
            }
            setShowDropdown(!showDropdown);
          }}
          style={{
            position: 'relative',
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: showDropdown ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-glass)',
            color: showDropdown ? 'var(--primary-color)' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                backgroundColor: 'var(--danger-color)',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 700,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div
            className="glass-panel animate-fade-in"
            style={{
              position: 'absolute',
              top: '50px',
              right: 0,
              width: '320px',
              maxHeight: '400px',
              overflowY: 'auto',
              zIndex: 100,
              padding: '16px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 550
                  }}
                >
                  <MailOpen size={12} />
                  Mark all read
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '300px' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  No notifications yet.
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: notif.isRead ? 'transparent' : 'rgba(59,130,246,0.06)',
                      border: '1px solid',
                      borderColor: notif.isRead ? 'transparent' : 'rgba(59,130,246,0.15)',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '0.8rem', fontWeight: notif.isRead ? 600 : 700, margin: '0 0 4px 0', color: notif.isRead ? 'var(--text-primary)' : 'white' }}>
                        {notif.title}
                      </h4>
                      {!notif.isRead && (
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', marginTop: '4px' }} />
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>
                      {notif.message}
                    </p>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', display: 'block', marginTop: '6px' }}>
                      {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Emergency Hazard SOS Modal */}
      <EmergencySOSModal
        isOpen={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        onSuccess={() => {
          fetchNotifications();
          setActiveTab('citizen-dash');
        }}
      />

      {/* Civic SLA Rights Charter Modal */}
      <CivicCharterModal
        isOpen={showCharterModal}
        onClose={() => setShowCharterModal(false)}
      />
    </div>
  );
};
