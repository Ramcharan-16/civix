import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  PlusCircle, 
  LogOut, 
  ShieldAlert, 
  Building2, 
  Briefcase,
  Layers
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  
  if (!user) return null;

  const role = user.role;

  const menuItems = [
    // Citizen options (available to all for browsing)
    { id: 'citizen-dash', label: 'Citizen Dashboard', icon: LayoutDashboard, roles: ['CITIZEN', 'STAFF', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'] },
    { id: 'public-complaints', label: 'Public Feed', icon: Layers, roles: ['CITIZEN', 'STAFF', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'] },
    { id: 'create-complaint', label: 'Lodge Complaint', icon: PlusCircle, roles: ['CITIZEN'] },
    
    // Staff option
    { id: 'staff-dash', label: 'Staff Tasklist', icon: Briefcase, roles: ['STAFF', 'SUPER_ADMIN'] },
    
    // Department Admin option
    { id: 'dept-dash', label: 'Department Console', icon: Building2, roles: ['DEPARTMENT_ADMIN', 'SUPER_ADMIN'] },
    
    // Super Admin options
    { id: 'super-dash', label: 'Admin Panel', icon: ShieldAlert, roles: ['SUPER_ADMIN'] }
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div
      className="glass-panel"
      style={{
        width: '260px',
        height: 'calc(100vh - 40px)',
        position: 'sticky',
        top: '20px',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        boxSizing: 'border-box',
        zIndex: 50
      }}
    >
      {/* Brand logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', paddingLeft: '8px' }}>
        <div 
          style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            color: 'white',
            fontWeight: 800
          }}
        >
          CX
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>Civix</h2>
          <span style={{ fontSize: '0.65rem', color: 'var(--primary-color)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>AI Triage Portal</span>
        </div>
      </div>

      {/* Menu links */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {filteredItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px 14px',
                border: 'none',
                borderRadius: '10px',
                background: isActive ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.15))' : 'transparent',
                color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                borderLeft: isActive ? '3px solid var(--primary-color)' : '3px solid transparent'
              }}
            >
              <Icon size={18} style={{ color: isActive ? 'var(--primary-color)' : 'inherit' }} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* User profile section at footer */}
      <div 
        style={{ 
          paddingTop: '20px', 
          borderTop: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: 'var(--primary-color)',
              border: '1px solid var(--border-glass)'
            }}
          >
            {user.name.charAt(0)}
          </div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            <h4 style={{ fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>{user.name}</h4>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{user.role.replace(/_/g, ' ')}</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-secondary"
          style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem', borderRadius: '8px' }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );
};
