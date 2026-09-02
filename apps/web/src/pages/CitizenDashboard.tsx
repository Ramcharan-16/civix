import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { Map } from '../components/Map';
import { FileText, CheckCircle, Clock, AlertTriangle, Eye, PlusCircle } from 'lucide-react';

interface Complaint {
  id: string;
  complaintNumber: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  latitude: number;
  longitude: number;
  address: string;
  createdAt: string;
  category: { name: string };
}

interface CitizenDashboardProps {
  onSelectComplaint: (id: string) => void;
  onLodgeComplaint: () => void;
}

export const CitizenDashboard: React.FC<CitizenDashboardProps> = ({ onSelectComplaint, onLodgeComplaint }) => {
  const { apiFetch, user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyComplaints = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/complaints?citizenId=${user?.id}`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints);
      }
    } catch (e) {
      console.error('Failed to fetch citizen dashboard complaints:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyComplaints();
      const interval = setInterval(async () => {
        try {
          const res = await apiFetch(`/api/complaints?citizenId=${user?.id}`);
          if (res.ok) {
            const data = await res.json();
            setComplaints(data.complaints);
          }
        } catch (e) {}
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Aggregate metrics
  const total = complaints.length;
  const resolved = complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
  const inProgress = complaints.filter(c => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED').length;
  const pending = total - resolved - inProgress;

  // Map pins from complaints
  const mapPoints = (complaints || []).map((c, idx) => ({
    id: c.id,
    title: c.title,
    lat: typeof c.latitude === 'number' && !isNaN(c.latitude) ? c.latitude : 12.971598 + (idx * 0.003),
    lng: typeof c.longitude === 'number' && !isNaN(c.longitude) ? c.longitude : 77.594562 + (idx * 0.003),
    status: c.status
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)' }}>
            <FileText size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Filed</h4>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{total}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.1)', color: 'var(--success-color)' }}>
            <CheckCircle size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Resolved</h4>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{resolved}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
            <Clock size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Progress</h4>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{inProgress}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning-color)' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pending</h4>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{pending}</h2>
          </div>
        </div>
      </div>

      {/* Main Grid: map and table */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px', alignItems: 'start' }}>
        {/* Complaints Table */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>My Lodged Incidents</h3>
            <button className="btn btn-primary" onClick={onLodgeComplaint} style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
              <PlusCircle size={14} />
              Lodge Incident
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Retrieving incident database...
            </div>
          ) : complaints.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <p style={{ margin: 0 }}>You haven't filed any civic incidents yet.</p>
              <button className="btn btn-secondary" onClick={onLodgeComplaint} style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                Create your first complaint
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 8px' }}>Ticket #</th>
                    <th style={{ padding: '10px 8px' }}>Title</th>
                    <th style={{ padding: '10px 8px' }}>Category</th>
                    <th style={{ padding: '10px 8px' }}>Status</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background-color 0.2s' }} className="table-row-hover">
                      <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--primary-color)' }}>{c.complaintNumber}</td>
                      <td style={{ padding: '12px 8px', color: 'white', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.title}>{c.title}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{c.category?.name || 'Unassigned'}</td>
                      <td style={{ padding: '12px 8px' }}><StatusBadge status={c.status} /></td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <button
                          onClick={() => onSelectComplaint(c.id)}
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                        >
                          <Eye size={12} />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <style>{`
                .table-row-hover:hover {
                  background-color: rgba(255,255,255,0.02);
                }
              `}</style>
            </div>
          )}
        </div>

        {/* Map Panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Incident Map Viewer</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            Visual coordinate plot of all complaints filed by your account inside Bengaluru municipality.
          </p>

          <Map points={mapPoints} />
        </div>
      </div>
    </div>
  );
};
