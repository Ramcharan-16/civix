import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { ThumbsUp, MessageSquare, Search, Filter, AlertCircle } from 'lucide-react';

interface Complaint {
  id: string;
  complaintNumber: string;
  title: string;
  description: string;
  address: string;
  status: string;
  severity: string;
  createdAt: string;
  category: { name: string };
  _count: { upvotes: number; comments: number };
  upvotes: { userId: string }[];
}

interface PublicComplaintsProps {
  onSelectComplaint: (id: string) => void;
}

export const PublicComplaints: React.FC<PublicComplaintsProps> = ({ onSelectComplaint }) => {
  const { apiFetch, user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [upvotingIds, setUpvotingIds] = useState<Record<string, boolean>>({});

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      let url = `/api/complaints?limit=25`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints);
      }
    } catch (e) {
      console.error('Failed to fetch complaints:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [search, statusFilter]);

  const handleUpvote = async (complaintId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent card click redirect
    if (upvotingIds[complaintId]) return;

    setUpvotingIds(prev => ({ ...prev, [complaintId]: true }));
    try {
      const res = await apiFetch(`/api/complaints/${complaintId}/upvote`, {
        method: 'POST'
      });

      if (res.ok) {
        const data = await res.json();
        // Update local count and states
        setComplaints(prev => prev.map(c => {
          if (c.id === complaintId) {
            const hasUpvoted = data.upvoted;
            const currentUpvotes = c.upvotes || [];
            const updatedUpvotes = hasUpvoted 
              ? [...currentUpvotes.filter(u => u.userId !== user?.id), { userId: user?.id || '' }] 
              : currentUpvotes.filter(u => u.userId !== user?.id);

            return {
              ...c,
              upvotes: updatedUpvotes,
              _count: {
                ...c._count,
                upvotes: updatedUpvotes.length
              }
            };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error('Failed to upvote:', err);
    } finally {
      setUpvotingIds(prev => ({ ...prev, [complaintId]: false }));
    }
  };

  const isUserUpvoted = (complaint: Complaint) => {
    return complaint.upvotes?.some(u => u.userId === user?.id) || false;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search and Filters panel */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '16px 20px', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '16px', 
          alignItems: 'center' 
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: 'var(--text-secondary)' 
            }} 
          />
          <input
            type="text"
            placeholder="Search by keywords, address, or ticket number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Cards list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          Loading community issues feed...
        </div>
      ) : complaints.length === 0 ? (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <AlertCircle size={32} style={{ color: 'var(--primary-color)' }} />
          <p>No complaints match your query or filters.</p>
        </div>
      ) : (
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '20px' 
          }}
        >
          {complaints.map(c => {
            const upvoted = isUserUpvoted(c);
            return (
              <div
                key={c.id}
                onClick={() => onSelectComplaint(c.id)}
                className="glass-panel glass-card-hover"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifySelf: 'flex-start', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary-color)', fontWeight: 700 }}>
                    {c.complaintNumber}
                  </span>
                  <StatusBadge status={c.status} />
                </div>

                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.title}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
                    {c.description}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Category: <strong style={{ color: 'white' }}>{c.category?.name || 'Unassigned'}</strong>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Locality: <strong style={{ color: 'white' }}>{c.address?.split(',')[0] || 'Unknown'}</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {/* Upvote Button */}
                    <button
                      onClick={(e) => handleUpvote(c.id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: upvoted ? 'var(--primary-color)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: upvoted ? 600 : 500,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: upvoted ? 'rgba(59,130,246,0.1)' : 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                      title={upvoted ? 'Remove Upvote' : 'Upvote this issue'}
                    >
                      <ThumbsUp size={14} fill={upvoted ? 'var(--primary-color)' : 'none'} />
                      <span>{c._count?.upvotes || 0}</span>
                    </button>

                    {/* Comments Counter */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem'
                      }}
                    >
                      <MessageSquare size={14} />
                      <span>{c._count?.comments || 0}</span>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
