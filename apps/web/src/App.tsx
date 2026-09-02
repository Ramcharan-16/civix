import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { PublicComplaints } from './pages/PublicComplaints';
import { CreateComplaint } from './pages/CreateComplaint';
import { StaffDashboard } from './pages/StaffDashboard';
import { DeptAdminDashboard } from './pages/DeptAdminDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { ComplaintDetail } from './pages/ComplaintDetail';
import { LiveActivityTicker } from './components/LiveActivityTicker';

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('citizen-dash');
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [authView, setAuthView] = useState<'login-citizen' | 'login-official' | 'register-citizen' | 'register-official'>('login-citizen');

  // Sync default tab based on user role when user logs in
  useEffect(() => {
    if (user) {
      if (user.role === 'SUPER_ADMIN') {
        setActiveTab('super-dash');
      } else if (user.role === 'DEPARTMENT_ADMIN') {
        setActiveTab('dept-dash');
      } else if (user.role === 'STAFF') {
        setActiveTab('staff-dash');
      } else {
        setActiveTab('citizen-dash');
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#020617' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 700, color: 'white', margin: 0 }}>Civix Platform</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading municipal assets...</p>
        </div>
      </div>
    );
  }

  // Not authenticated view
  if (!user) {
    if (authView === 'register-citizen' || authView === 'register-official') {
      return (
        <Register
          isOfficial={authView === 'register-official'}
          onSwitchToLogin={() => setAuthView(authView === 'register-official' ? 'login-official' : 'login-citizen')}
        />
      );
    }

    return (
      <Login
        isOfficial={authView === 'login-official'}
        onSwitchPortal={() => setAuthView(authView === 'login-citizen' ? 'login-official' : 'login-citizen')}
        onSwitchToRegister={() => setAuthView(authView === 'login-official' ? 'register-official' : 'register-citizen')}
      />
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', padding: '20px', boxSizing: 'border-box', gap: '20px' }}>
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          setSelectedComplaintId={setSelectedComplaintId} 
        />

        {/* Dynamic Live Municipal Broadcast Radar Ticker */}
        <LiveActivityTicker />

        {/* Tab content routing */}
        <div style={{ flex: 1, padding: '0 24px 24px 24px', boxSizing: 'border-box' }}>
          {activeTab === 'citizen-dash' && (
            <CitizenDashboard
              onSelectComplaint={(id) => {
                setSelectedComplaintId(id);
                setActiveTab('complaint-detail');
              }}
              onLodgeComplaint={() => setActiveTab('create-complaint')}
            />
          )}

          {activeTab === 'public-complaints' && (
            <PublicComplaints
              onSelectComplaint={(id) => {
                setSelectedComplaintId(id);
                setActiveTab('complaint-detail');
              }}
            />
          )}

          {activeTab === 'create-complaint' && (
            <CreateComplaint
              onSuccess={() => setActiveTab('citizen-dash')}
            />
          )}

          {activeTab === 'staff-dash' && (
            <StaffDashboard
              onSelectComplaint={(id) => {
                setSelectedComplaintId(id);
                setActiveTab('complaint-detail');
              }}
            />
          )}

          {activeTab === 'dept-dash' && (
            <DeptAdminDashboard
              onSelectComplaint={(id) => {
                setSelectedComplaintId(id);
                setActiveTab('complaint-detail');
              }}
            />
          )}

          {activeTab === 'super-dash' && (
            <SuperAdminDashboard
              onSelectComplaint={(id) => {
                setSelectedComplaintId(id);
                setActiveTab('complaint-detail');
              }}
            />
          )}

          {activeTab === 'complaint-detail' && selectedComplaintId && (
            <ComplaintDetail
              complaintId={selectedComplaintId}
              onBack={() => {
                // Return to appropriate tab based on role
                if (user.role === 'SUPER_ADMIN') {
                  setActiveTab('super-dash');
                } else if (user.role === 'DEPARTMENT_ADMIN') {
                  setActiveTab('dept-dash');
                } else if (user.role === 'STAFF') {
                  setActiveTab('staff-dash');
                } else {
                  setActiveTab('citizen-dash');
                }
                setSelectedComplaintId(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
