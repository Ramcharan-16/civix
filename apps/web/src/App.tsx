import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LiveActivityTicker } from './components/LiveActivityTicker';

// Code-split dashboard pages for fast initial bundle delivery
const CitizenDashboard = lazy(() => import('./pages/CitizenDashboard').then(m => ({ default: m.CitizenDashboard })));
const PublicComplaints = lazy(() => import('./pages/PublicComplaints').then(m => ({ default: m.PublicComplaints })));
const CreateComplaint = lazy(() => import('./pages/CreateComplaint').then(m => ({ default: m.CreateComplaint })));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard').then(m => ({ default: m.StaffDashboard })));
const DeptAdminDashboard = lazy(() => import('./pages/DeptAdminDashboard').then(m => ({ default: m.DeptAdminDashboard })));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const ComplaintDetail = lazy(() => import('./pages/ComplaintDetail').then(m => ({ default: m.ComplaintDetail })));

const DashboardLoadingFallback: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', width: '100%' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid rgba(56, 189, 248, 0.2)',
        borderTop: '3px solid #38bdf8',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 12px'
      }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Loading portal view...</p>
    </div>
  </div>
);

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
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(56, 189, 248, 0.2)',
            borderTop: '3px solid #38bdf8',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <h2 style={{ fontFamily: 'Outfit', fontWeight: 700, color: 'white', margin: '0 0 6px 0', fontSize: '1.25rem' }}>Civix Platform</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Connecting municipal network...</p>
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
          <Suspense fallback={<DashboardLoadingFallback />}>
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
          </Suspense>
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
