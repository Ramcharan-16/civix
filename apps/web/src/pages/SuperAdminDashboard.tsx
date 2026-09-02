import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, XCircle, Eye, ShieldAlert, Layers, Activity } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  categories: Category[];
}

interface Complaint {
  id: string;
  complaintNumber: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  priority: string;
  aiCategory: string | null;
  aiSeverity: string | null;
  aiConfidence: number | null;
  createdAt: string;
  categoryId: string;
  category: Category;
  citizen: { name: string };
}



interface SuperAdminDashboardProps {
  onSelectComplaint: (id: string) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onSelectComplaint }) => {
  const { apiFetch } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'TRIAGE' | 'SLA_SETTINGS' | 'PREFERENCES'>('TRIAGE');

  // Input states for verifying a complaint
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('MEDIUM');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('MEDIUM');
  const [actionComment, setActionComment] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // SLA Settings Tab States
  const [slaSettingsList, setSlaSettingsList] = useState<any[]>([]);
  const [editingSlaId, setEditingSlaId] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState<string>('');

  // User Notification Preferences States
  const [prefs, setPrefs] = useState({
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: true,
    pushNotificationsEnabled: true,
    assignmentNotificationsEnabled: true,
    statusChangeNotificationsEnabled: true,
    deadlineNotificationsEnabled: true,
    overdueNotificationsEnabled: true
  });
  const [prefsLoading, setPrefsLoading] = useState(false);

  const fetchSlaSettings = async () => {
    try {
      const res = await apiFetch('/api/admin/sla-settings');
      if (res.ok) {
        const data = await res.json();
        setSlaSettingsList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateSla = async (type: string, key: string) => {
    const hours = parseFloat(editingDuration);
    if (Number.isNaN(hours) || hours < 0) {
      alert('Please enter a valid duration in hours.');
      return;
    }

    try {
      const res = await apiFetch('/api/admin/sla-settings', {
        method: 'PUT',
        body: JSON.stringify({
          type,
          key,
          durationMinutes: Math.round(hours * 60)
        })
      });

      if (res.ok) {
        alert('SLA Policy Setting updated successfully!');
        setEditingSlaId(null);
        await fetchSlaSettings();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update SLA setting.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await apiFetch('/api/users/me');
      if (res.ok) {
        const data = await res.json();
        setPrefs({
          emailNotificationsEnabled: data.emailNotificationsEnabled ?? true,
          smsNotificationsEnabled: data.smsNotificationsEnabled ?? true,
          pushNotificationsEnabled: data.pushNotificationsEnabled ?? true,
          assignmentNotificationsEnabled: data.assignmentNotificationsEnabled ?? true,
          statusChangeNotificationsEnabled: data.statusChangeNotificationsEnabled ?? true,
          deadlineNotificationsEnabled: data.deadlineNotificationsEnabled ?? true,
          overdueNotificationsEnabled: data.overdueNotificationsEnabled ?? true
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefsLoading(true);
    try {
      const res = await apiFetch('/api/users/me/preferences', {
        method: 'PUT',
        body: JSON.stringify(prefs)
      });
      if (res.ok) {
        alert('Notification preferences updated successfully!');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update preferences.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPrefsLoading(false);
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const compRes = await apiFetch('/api/complaints?limit=50');
      const deptRes = await apiFetch('/api/departments');

      if (compRes.ok && deptRes.ok) {
        const compData = await compRes.json();
        setComplaints(compData.complaints);

        const deptData = await deptRes.json();
        setDepartments(deptData);
        if (deptData.length > 0) {
          setSelectedDeptId(deptData[0].id);
        }
      }
    } catch (e) {
      console.error('SuperAdmin Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const pendingVerification = complaints.filter(c => c.status === 'PENDING_VERIFICATION');

  const startVerification = (comp: Complaint) => {
    setVerifyingId(comp.id);
    setSelectedSeverity(comp.aiSeverity || comp.severity || 'MEDIUM');
    setSelectedPriority('MEDIUM');
    setActionComment(`Complaint verified. AI categorization "${comp.aiCategory || 'N/A'}" validated.`);
    
    // Find department that matches the category or use the first one
    if (departments.length > 0) {
      // Find category in department mapping
      const categoryDept = departments.find(d => d.categories.some(cat => cat.name === comp.aiCategory || cat.id === comp.categoryId));
      setSelectedDeptId(categoryDept ? categoryDept.id : departments[0].id);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingId || !selectedDeptId) return;

    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/complaints/${verifyingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'VERIFIED',
          assignedDepartmentId: selectedDeptId,
          priority: selectedPriority,
          severity: selectedSeverity,
          comment: actionComment || 'Incident verified and routed by Platform Governance.'
        })
      });

      if (res.ok) {
        // Remove verified complaint from list or change status locally
        setComplaints(prev => prev.map(c => c.id === verifyingId 
          ? { 
              ...c, 
              status: 'VERIFIED',
              severity: selectedSeverity,
              priority: selectedPriority
            } 
          : c
        ));
        setVerifyingId(null);
      }
    } catch (err) {
      console.error('Failed to verify complaint:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (complaintId: string) => {
    const comment = prompt('Please enter rejection reason:');
    if (!comment) return;

    try {
      const res = await apiFetch(`/api/complaints/${complaintId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'REJECTED',
          comment: `Rejection details: ${comment}`
        })
      });

      if (res.ok) {
        setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, status: 'REJECTED' } : c));
      }
    } catch (err) {
      console.error('Failed to reject complaint:', err);
    }
  };

  // Platform metrics totals
  const total = complaints.length;
  const underVerification = pendingVerification.length;
  const verifiedCount = complaints.filter(c => c.status === 'VERIFIED' || c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS').length;
  const closedCount = complaints.filter(c => c.status === 'CLOSED' || c.status === 'RESOLVED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Navbar / Tab Row */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '12px 20px', 
          display: 'flex', 
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCurrentTab('TRIAGE')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: currentTab === 'TRIAGE' ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: currentTab === 'TRIAGE' ? 'var(--primary-color)' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            Triage Queue
          </button>
          <button
            onClick={() => {
              setCurrentTab('SLA_SETTINGS');
              fetchSlaSettings();
            }}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: currentTab === 'SLA_SETTINGS' ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: currentTab === 'SLA_SETTINGS' ? 'var(--primary-color)' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            SLA Policy Manager
          </button>
          <button
            onClick={() => {
              setCurrentTab('PREFERENCES');
              fetchPreferences();
            }}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: currentTab === 'PREFERENCES' ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: currentTab === 'PREFERENCES' ? 'var(--primary-color)' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            Notification Preferences
          </button>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Platform Role: <strong>SUPER ADMIN</strong>
        </div>
      </div>

      {currentTab === 'TRIAGE' && (
        <>
          {/* Platform Statistics cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--accent-color)' }}>
                <Layers size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>System Tickets</h4>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{total}</h2>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning-color)' }}>
                <ShieldAlert size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Triage Queue</h4>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{underVerification}</h2>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)' }}>
                <Activity size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Dispatch</h4>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{verifiedCount}</h2>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--success-color)' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Closed Files</h4>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{closedCount}</h2>
              </div>
            </div>
          </div>

          {/* Verification overlay panel */}
          {verifyingId && (() => {
            const selectedComp = complaints.find(c => c.id === verifyingId);
            if (!selectedComp) return null;

            return (
              <div 
                style={{ 
                  position: 'fixed', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  bottom: 0, 
                  backgroundColor: 'rgba(0,0,0,0.85)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  zIndex: 1000 
                }}
              >
                <div 
                  className="glass-panel" 
                  style={{ 
                    padding: '30px', 
                    width: '550px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '20px', 
                    maxHeight: '90vh', 
                    overflowY: 'auto' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'white' }}>Route Ticket to Department</h3>
                    <button 
                      onClick={() => setVerifyingId(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}
                    >
                      &times;
                    </button>
                  </div>

                  {/* AI predictions callout */}
                  <div 
                    style={{ 
                      backgroundColor: 'rgba(168,85,247,0.08)', 
                      border: '1px solid rgba(168,85,247,0.2)', 
                      borderRadius: '10px', 
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <h4 style={{ fontSize: '0.85rem', margin: 0, color: '#d8b4fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>✨ AI Triage Predictions</span>
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
                      <div>Estimated Category: <strong style={{ color: 'white' }}>{selectedComp.aiCategory || 'N/A'}</strong></div>
                      <div>Estimated Severity: <strong style={{ color: 'white' }}>{selectedComp.aiSeverity || 'N/A'}</strong></div>
                      <div>AI Confidence Score: <strong style={{ color: 'white' }}>{selectedComp.aiConfidence ? `${Math.round(selectedComp.aiConfidence * 100)}%` : 'N/A'}</strong></div>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Assign Department *</label>
                      <select
                        value={selectedDeptId}
                        onChange={(e) => setSelectedDeptId(e.target.value)}
                        required
                      >
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Adjust Severity</label>
                        <select
                          value={selectedSeverity}
                          onChange={(e) => setSelectedSeverity(e.target.value)}
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="CRITICAL">Critical</option>
                        </select>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Set Priority</label>
                        <select
                          value={selectedPriority}
                          onChange={(e) => setSelectedPriority(e.target.value)}
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Verification Comments</label>
                      <input
                        type="text"
                        placeholder="Provide details about the verification routing..."
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => setVerifyingId(null)}
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={actionLoading}
                        style={{ flex: 2 }}
                      >
                        {actionLoading ? 'Routing...' : 'Approve & Route'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            );
          })()}

          {/* Main split layouts: Queue and Audit logs */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px', alignItems: 'start' }}>
            {/* Verification Queue list */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                📥 Triage Verification Queue ({underVerification})
              </h3>

              {loading ? (
                <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading queue records...
                </div>
              ) : pendingVerification.length === 0 ? (
                <div style={{ padding: '50px 0', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={28} style={{ color: 'var(--success-color)' }} />
                  <p style={{ margin: 0 }}>All incoming complaints verified!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pendingVerification.map(c => (
                    <div
                      key={c.id}
                      style={{
                        padding: '16px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-glass)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 700 }}>
                          {c.complaintNumber}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          Filed by: <strong>{c.citizen?.name}</strong>
                        </span>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '0.95rem', margin: '0 0 4px 0', color: 'white' }}>{c.title}</h4>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                          {c.description}
                        </p>
                      </div>

                      <div 
                        style={{ 
                          fontSize: '0.72rem', 
                          backgroundColor: 'rgba(168,85,247,0.06)', 
                          padding: '8px 12px', 
                          borderRadius: '6px',
                          border: '1px solid rgba(168,85,247,0.12)'
                        }}
                      >
                        AI Estimate: <strong style={{ color: '#d8b4fe' }}>{c.aiCategory || 'N/A'}</strong> (Severity: <strong style={{ color: '#d8b4fe' }}>{c.aiSeverity || 'N/A'}</strong>)
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button
                          onClick={() => onSelectComplaint(c.id)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        >
                          <Eye size={12} />
                          View Details
                        </button>
                        
                        <button
                          onClick={() => handleReject(c.id)}
                          className="btn btn-danger"
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        >
                          <XCircle size={12} />
                          Reject
                        </button>

                        <button
                          onClick={() => startVerification(c)}
                          className="btn btn-success"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          <ShieldCheck size={12} />
                          Verify & Route
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System activity logs list */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                🛡️ Platform Audit Trail
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Real-time security log tracking platform governance events and state changes.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { id: '1', action: 'CREATE_COMPLAINT', entity: 'Complaint', user: 'Aarav Mehta', ip: '192.168.1.42', date: 'Just now' },
                  { id: '2', action: 'USER_LOGIN', entity: 'User', user: 'Rajesh Kumar', ip: '127.0.0.1', date: '3 mins ago' },
                  { id: '3', action: 'UPDATE_COMPLAINT_STATUS', entity: 'Complaint', user: 'Ramesh Gowda', ip: '192.168.1.102', date: '1 hour ago' },
                  { id: '4', action: 'UPDATE_USER_ROLE', entity: 'User', user: 'Rajesh Kumar', ip: '127.0.0.1', date: '4 hours ago' },
                  { id: '5', action: 'CREATE_DEPARTMENT', entity: 'Department', user: 'Rajesh Kumar', ip: '127.0.0.1', date: '1 day ago' }
                ].map(log => (
                  <div
                    key={log.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255,255,255,0.01)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      fontSize: '0.72rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 650, color: 'white', marginBottom: '2px' }}>
                      <span>{log.action}</span>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>{log.date}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      User: <strong style={{ color: 'white' }}>{log.user}</strong> (IP: {log.ip})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {currentTab === 'SLA_SETTINGS' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px 0', color: 'white' }}>SLA Duration Policy Manager</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Configure resolution time allocations based on incident categories and severity levels.</p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 10px' }}>Policy Type</th>
                  <th style={{ padding: '12px 10px' }}>Key</th>
                  <th style={{ padding: '12px 10px' }}>Expected Duration (Hours)</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slaSettingsList.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '14px 10px', color: 'white', fontWeight: 600 }}>{item.type}</td>
                    <td style={{ padding: '14px 10px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 
                          item.key === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : 
                          item.key === 'HIGH' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)',
                        color: 
                          item.key === 'CRITICAL' ? 'var(--danger-color)' : 
                          item.key === 'HIGH' ? 'var(--warning-color)' : 'var(--text-primary)'
                      }}>
                        {item.key}
                      </span>
                    </td>
                    <td style={{ padding: '14px 10px', color: 'white' }}>
                      {editingSlaId === item.id ? (
                        <input
                          type="number"
                          step="0.5"
                          value={editingDuration}
                          onChange={(e) => setEditingDuration(e.target.value)}
                          style={{ padding: '4px 8px', width: '90px', fontSize: '0.8rem', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', color: '#fff' }}
                        />
                      ) : (
                        <strong>{item.durationHours ?? (item.durationMinutes / 60)} Hours</strong>
                      )}
                    </td>
                    <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                      {editingSlaId === item.id ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleUpdateSla(item.type, item.key)}
                            className="btn btn-success"
                            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingSlaId(null)}
                            className="btn btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingSlaId(item.id);
                            setEditingDuration(String(item.durationHours ?? item.durationMinutes / 60));
                          }}
                          className="btn btn-primary"
                          style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                        >
                          Modify SLA
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {currentTab === 'PREFERENCES' && (
        <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '600px', margin: '0 auto' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px 0', color: 'white' }}>Notification Preferences</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Configure which communication channels CIVIX should use to deliver alerts.</p>
          </div>

          <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 650, margin: 0, color: 'white' }}>Delivery Channels</h4>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="pref-email"
                  checked={prefs.emailNotificationsEnabled}
                  onChange={(e) => setPrefs(prev => ({ ...prev, emailNotificationsEnabled: e.target.checked }))}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="pref-email" style={{ fontSize: '0.85rem', color: 'white', cursor: 'pointer' }}>
                  Enable Email Dispatch
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="pref-sms"
                  checked={prefs.smsNotificationsEnabled}
                  onChange={(e) => setPrefs(prev => ({ ...prev, smsNotificationsEnabled: e.target.checked }))}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="pref-sms" style={{ fontSize: '0.85rem', color: 'white', cursor: 'pointer' }}>
                  Enable SMS Text Alerts
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="pref-push"
                  checked={prefs.pushNotificationsEnabled}
                  onChange={(e) => setPrefs(prev => ({ ...prev, pushNotificationsEnabled: e.target.checked }))}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="pref-push" style={{ fontSize: '0.85rem', color: 'white', cursor: 'pointer' }}>
                  Enable Push Notifications
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 650, margin: 0, color: 'white' }}>Alert Triggers</h4>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="pref-assign"
                  checked={prefs.assignmentNotificationsEnabled}
                  onChange={(e) => setPrefs(prev => ({ ...prev, assignmentNotificationsEnabled: e.target.checked }))}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="pref-assign" style={{ fontSize: '0.85rem', color: 'white', cursor: 'pointer' }}>
                  New Task Assignment Alerts
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="pref-status"
                  checked={prefs.statusChangeNotificationsEnabled}
                  onChange={(e) => setPrefs(prev => ({ ...prev, statusChangeNotificationsEnabled: e.target.checked }))}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="pref-status" style={{ fontSize: '0.85rem', color: 'white', cursor: 'pointer' }}>
                  Ticket Status Updates
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="pref-deadline"
                  checked={prefs.deadlineNotificationsEnabled}
                  onChange={(e) => setPrefs(prev => ({ ...prev, deadlineNotificationsEnabled: e.target.checked }))}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="pref-deadline" style={{ fontSize: '0.85rem', color: 'white', cursor: 'pointer' }}>
                  Resolution Deadline Warnings
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="pref-overdue"
                  checked={prefs.overdueNotificationsEnabled}
                  onChange={(e) => setPrefs(prev => ({ ...prev, overdueNotificationsEnabled: e.target.checked }))}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="pref-overdue" style={{ fontSize: '0.85rem', color: 'white', cursor: 'pointer' }}>
                  Escalation / Overdue Status Alerts
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={prefsLoading}
              style={{ marginTop: '10px', alignSelf: 'flex-start', padding: '10px 18px' }}
            >
              {prefsLoading ? 'Saving Settings...' : 'Save Settings Preferences'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
