import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { UserCheck, Eye, ShieldAlert, FileSpreadsheet, Check } from 'lucide-react';

interface Complaint {
  id: string;
  complaintNumber: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  priority: string;
  createdAt: string;
  deadlineAt: string | null;
  slaStatus: string | null;
  assignedDepartmentId: string | null;
  category: { id: string; name: string; departmentId: string };
  assignedStaff: { id: string; name: string } | null;
}

interface Staff {
  id: string;
  name: string;
  email: string;
}

interface DeptAdminDashboardProps {
  onSelectComplaint: (id: string) => void;
}

export const DeptAdminDashboard: React.FC<DeptAdminDashboardProps> = ({ onSelectComplaint }) => {
  const { apiFetch, user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Keep track of which staff is selected for assignment inline
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Record<string, string>>({});
  const [assignedSuccessMap, setAssignedSuccessMap] = useState<Record<string, boolean>>({});

  const fetchDeptData = async () => {
    setLoading(true);
    try {
      const compRes = await apiFetch('/api/complaints?limit=30');
      const staffRes = await apiFetch('/api/departments/staff');

      if (compRes.ok && staffRes.ok) {
        const compData = await compRes.json();
        setComplaints(compData.complaints);
        
        const staffData = await staffRes.json();
        setStaffList(staffData);

        // Prepopulate selected staff map
        const initialSelectedStaff: Record<string, string> = {};
        compData.complaints.forEach((c: Complaint) => {
          if (c.assignedStaff) {
            initialSelectedStaff[c.id] = c.assignedStaff.id;
          } else if (staffData.length > 0) {
            initialSelectedStaff[c.id] = staffData[0].id;
          }
        });
        setSelectedStaffIds(initialSelectedStaff);
      }
    } catch (e) {
      console.error('Failed to load department data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeptData();
  }, []);

  const handleAssignStaff = async (complaintId: string) => {
    const staffId = selectedStaffIds[complaintId];
    if (!staffId) return;

    const complaint = complaints.find(c => c.id === complaintId);
    if (!complaint) return;

    const departmentId = complaint.assignedDepartmentId || (complaint.category as any)?.departmentId || (user as any)?.departmentId;
    if (!departmentId) return;

    const assignedStaffObj = staffList.find(s => s.id === staffId);

    setAssigningId(complaintId);
    try {
      const res = await apiFetch(`/api/complaints/${complaintId}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          departmentId,
          staffId,
          priority: complaint.priority || 'MEDIUM',
          reason: 'Department admin delegated complaint to regional field worker.'
        })
      });

      if (res.ok) {
        // Smooth inline update without browser alert popup
        setComplaints(prev => prev.map(c => c.id === complaintId ? {
          ...c,
          status: 'ASSIGNED',
          assignedStaff: assignedStaffObj || c.assignedStaff
        } : c));

        setAssignedSuccessMap(prev => ({ ...prev, [complaintId]: true }));
        setTimeout(() => {
          setAssignedSuccessMap(prev => ({ ...prev, [complaintId]: false }));
        }, 2500);
      }
    } catch (err) {
      console.error('Failed to assign staff:', err);
    } finally {
      setAssigningId(null);
    }
  };

  // Aggregated calculations
  const total = complaints.length;
  const verifiedPendingAssign = complaints.filter(c => c.status === 'VERIFIED' || c.status === 'SUBMITTED' || !c.assignedStaff).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--accent-color)' }}>
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Department Complaints</h4>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{total}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(245,158,11,0.1)', color: 'var(--warning-color)' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Awaiting Assignment</h4>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{verifiedPendingAssign}</h2>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Field Officers</h4>
            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 800 }}>{staffList.length}</h2>
          </div>
        </div>
      </div>

      {/* Main Grid: Management Table on left, Staff summary on right */}
      <div style={{ display: 'grid', gridTemplateColumns: '8fr 4fr', gap: '24px', alignItems: 'start' }}>
        {/* Complaints Assignment Queue */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              📋 Complaints Assignment Queue
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Showing {complaints.length} tickets
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              Loading complaints queue...
            </div>
          ) : complaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              No complaints in queue!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '10px 8px' }}>Ticket / Status</th>
                    <th style={{ padding: '10px 8px' }}>Title</th>
                    <th style={{ padding: '10px 8px' }}>Category</th>
                    <th style={{ padding: '10px 8px' }}>Assign Officer</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--primary-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span>{c.complaintNumber}</span>
                          <StatusBadge status={c.status} />
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', color: 'white', maxWidth: '180px' }} title={c.title}>
                        <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                      </td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>
                        {c.category?.name}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {c.status === 'RESOLVED' || c.status === 'CLOSED' || c.status === 'REJECTED' ? (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                            {c.assignedStaff ? `Resolved by ${c.assignedStaff.name}` : 'Unassigned'}
                          </span>
                        ) : (
                          <select
                            value={selectedStaffIds[c.id] || ''}
                            onChange={(e) => setSelectedStaffIds(prev => ({ ...prev, [c.id]: e.target.value }))}
                            style={{ padding: '6px 10px', fontSize: '0.8rem', width: '160px' }}
                          >
                            {staffList.map(staff => (
                              <option key={staff.id} value={staff.id}>{staff.name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={() => onSelectComplaint(c.id)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            title="View full complaint file"
                          >
                            <Eye size={12} />
                          </button>
                          
                          {c.status !== 'RESOLVED' && c.status !== 'CLOSED' && c.status !== 'REJECTED' && (
                            <button
                              onClick={() => handleAssignStaff(c.id)}
                              disabled={assigningId === c.id || staffList.length === 0}
                              className={assignedSuccessMap[c.id] ? "btn btn-success" : "btn btn-primary"}
                              style={{ 
                                padding: '6px 12px', 
                                fontSize: '0.75rem',
                                transition: 'all 0.3s ease',
                                minWidth: '85px',
                                justifyContent: 'center'
                              }}
                            >
                              {assignedSuccessMap[c.id] ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#fff' }}>
                                  <Check size={12} /> Assigned
                                </span>
                              ) : assigningId === c.id ? (
                                'Assigning...'
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <UserCheck size={12} />
                                  {c.assignedStaff ? 'Reassign' : 'Assign'}
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Staff Roster panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            👥 Department Field Staff
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
            List of active field officers registered inside the municipality database for assignment.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {staffList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                No active staff found.
              </div>
            ) : (
              staffList.map(staff => (
                <div
                  key={staff.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(59,130,246,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--primary-color)'
                    }}
                  >
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.8rem', margin: 0, fontWeight: 600, color: 'white' }}>{staff.name}</h4>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{staff.email}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
