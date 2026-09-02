import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Briefcase, CheckCircle, Eye, Clock, ShieldAlert, Award } from 'lucide-react';

interface Complaint {
  id: string;
  complaintNumber: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  priority: string;
  address: string;
  createdAt: string;
  deadlineAt: string | null;
  slaStatus: string | null;
  category: { name: string };
}

interface StaffDashboardProps {
  onSelectComplaint: (id: string) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onSelectComplaint }) => {
  const { apiFetch, user } = useAuth();
  const [allTasks, setAllTasks] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ASSIGNED');

  const fetchAssignedTasks = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/complaints?assignedStaffId=${user?.id}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setAllTasks(data.complaints);
      }
    } catch (e) {
      console.error('Failed to fetch staff tasklist:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAssignedTasks();
    }
  }, [user]);

  // Aggregate metric numbers
  const total = allTasks.length;
  const assigned = allTasks.filter(c => c.status === 'ASSIGNED').length;
  const inProgress = allTasks.filter(c => c.status === 'IN_PROGRESS').length;
  const onHold = allTasks.filter(c => c.status === 'ON_HOLD').length;
  const resolved = allTasks.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
  const resolvedRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Filtered list
  const displayedComplaints = allTasks.filter(c => c.status === statusFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--accent-color)' }}>
            <Briefcase size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Assigned</h4>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{assigned}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)' }}>
            <Clock size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>In Progress</h4>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{inProgress}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning-color)' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>On Hold</h4>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{onHold}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--success-color)' }}>
            <Award size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Resolution Rate</h4>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{resolvedRate}%</h2>
          </div>
        </div>
      </div>

      {/* Tab selectors */}
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
          {(['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                backgroundColor: statusFilter === tab ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: statusFilter === tab ? 'var(--primary-color)' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              {tab.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <Briefcase size={14} style={{ color: 'var(--primary-color)' }} />
          <span>Staff ID: <strong>{user?.id.substring(0, 8)}</strong></span>
        </div>
      </div>

      {/* Task list cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          Loading assigned worklist...
        </div>
      ) : displayedComplaints.length === 0 ? (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '60px', 
            textAlign: 'center', 
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <CheckCircle size={36} style={{ color: 'var(--success-color)' }} />
          <h3>No complaints in {statusFilter.replace(/_/g, ' ')} queue!</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>All assignments are caught up. Check other queues or take a break.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {displayedComplaints.map(c => (
            <div
              key={c.id}
              className="glass-panel"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                borderLeft: `4px solid ${
                  c.severity === 'CRITICAL' ? 'var(--danger-color)' : 
                  c.severity === 'HIGH' ? 'var(--warning-color)' : 'var(--primary-color)'
                }`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--primary-color)', fontWeight: 700 }}>
                  {c.complaintNumber}
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 
                      c.severity === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : 
                      c.severity === 'HIGH' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)',
                    color: 
                      c.severity === 'CRITICAL' ? 'var(--danger-color)' : 
                      c.severity === 'HIGH' ? 'var(--warning-color)' : 'var(--text-primary)'
                  }}>
                    {c.severity}
                  </span>
                  <StatusBadge status={c.status} />
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0', color: 'white' }}>
                  {c.title}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
                  {c.description}
                </p>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Category: <strong style={{ color: 'white' }}>{c.category?.name}</strong></span>
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                  Address: <strong style={{ color: 'white' }}>{c.address}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                  Assigned: {new Date(c.createdAt).toLocaleDateString()}
                </span>

                <button
                  onClick={() => onSelectComplaint(c.id)}
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                >
                  <Eye size={12} />
                  Open Task
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
