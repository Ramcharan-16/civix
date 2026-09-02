import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { 
  ArrowLeft, 
  MessageSquare, 
  Clock, 
  Send, 
  Lock, 
  Star, 
  CheckCircle,
  FileImage
} from 'lucide-react';

interface StatusLog {
  id: string;
  oldStatus: string;
  newStatus: string;
  comment: string | null;
  createdAt: string;
  user: { name: string; role: string };
}

interface Comment {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user: { name: string; role: string };
}

interface Feedback {
  rating: number;
  comment: string | null;
}

interface ComplaintDetail {
  id: string;
  complaintNumber: string;
  title: string;
  description: string;
  address: string;
  status: string;
  severity: string;
  priority: string;
  aiCategory: string | null;
  aiSeverity: string | null;
  aiConfidence: number | null;
  createdAt: string;
  resolvedAt: string | null;
  category: { id: string; name: string };
  citizen: { name: string; email: string; phone: string };
  assignedStaff: { id: string; name: string; email: string } | null;
  assignedDepartmentId: string | null;
  assignedDepartment: { name: string } | null;
  assignedAt: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  expectedDurationMinutes: number | null;
  deadlineAt: string | null;
  actualResolutionDurationMinutes: number | null;
  slaStatus: string;
  progressPercentage: number;
  lastProgressUpdateAt: string | null;
  overdueAt: string | null;
  escalatedAt: string | null;
  media: { id: string; fileUrl: string }[];
  statusLogs: StatusLog[];
  comments: Comment[];
  feedbacks: Feedback[];
  assignments: {
    id: string;
    department: { name: string };
    staff: { name: string; email: string };
    assigner: { name: string };
    assignedAt: string;
    reason: string | null;
  }[];
  progressUpdates: {
    id: string;
    progressPercentage: number;
    title?: string;
    description: string;
    createdAt: string;
    staff?: { name: string };
  }[];
}

interface ComplaintDetailProps {
  complaintId: string;
  onBack: () => void;
}

export const ComplaintDetail: React.FC<ComplaintDetailProps> = ({ complaintId, onBack }) => {
  const { apiFetch, user } = useAuth();
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Comments state
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  // Staff status action states
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  // Rating feedback state
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // SLA configurations and assignment lists
  const [departments, setDepartments] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('MEDIUM');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Reopen states
  const [reopenReason, setReopenReason] = useState('');
  const [reopenLoading, setReopenLoading] = useState(false);
  const [showReopenForm, setShowReopenForm] = useState(false);


  // Staff action fields
  const [estimatedTimeframe, setEstimatedTimeframe] = useState('Within 2 to 4 Hours');
  const [progressPct, setProgressPct] = useState('50');
  const [holdReason, setHoldReason] = useState('Waiting for materials');
  const [holdComment, setHoldComment] = useState('');
  const [expectedRestartDate, setExpectedRestartDate] = useState('');
  const [showHoldModal, setShowHoldModal] = useState(false);

  const fetchComplaintDetails = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/complaints/${complaintId}`);
      if (res.ok) {
        const data = await res.json();
        setComplaint(data);
      }
    } catch (e) {
      console.error('Failed to load complaint file details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaintDetails();
  }, [complaintId]);

  // Load departments and staff if user is admin
  useEffect(() => {
    const fetchAssignmentOptions = async () => {
      if (user && (user.role === 'SUPER_ADMIN' || user.role === 'DEPARTMENT_ADMIN')) {
        try {
          const deptRes = await apiFetch('/api/departments');
          const staffRes = await apiFetch('/api/departments/staff');
          if (deptRes.ok && staffRes.ok) {
            const depts = await deptRes.json();
            const staff = await staffRes.json();
            setDepartments(depts);
            setStaffList(staff);
            if (depts.length > 0) setSelectedDeptId(depts[0].id);
            if (staff.length > 0) setSelectedStaffId(staff[0].id);
          }
        } catch (e) {
          console.error('Failed to load assignment options:', e);
        }
      }
    };
    fetchAssignmentOptions();
  }, [user]);



  // Clean state declarations
  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeptId || !selectedStaffId) return;

    setAssignLoading(true);
    try {
      const res = await apiFetch(`/api/complaints/${complaintId}/assign`, {
        method: 'POST',
        body: JSON.stringify({
          departmentId: selectedDeptId,
          staffId: selectedStaffId,
          priority: selectedPriority,
          reason: assignNotes
        })
      });

      if (res.ok) {
        setAssignNotes('');
        await fetchComplaintDetails();
      }
    } catch (err) {
      console.error('Failed to assign:', err);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAcceptTask = async () => {
    setUpdatingStatus('ACCEPT');
    try {
      const res = await apiFetch(`/api/complaints/${complaintId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ estimatedTimeframe })
      });
      if (res.ok) {
        await fetchComplaintDetails();
      }
    } catch (err) {
      console.error('Failed to accept task:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleStartTaskWork = async () => {
    setUpdatingStatus('START');
    try {
      const res = await apiFetch(`/api/complaints/${complaintId}/start-work`, {
        method: 'POST',
        body: JSON.stringify({ notes: actionComment, estimatedTimeframe })
      });
      if (res.ok) {
        setActionComment('');
        await fetchComplaintDetails();
      }
    } catch (err) {
      console.error('Failed to start work:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const [progressSuccessMsg, setProgressSuccessMsg] = useState<string | null>(null);

  const handleProgressUpdate = async (pct: number) => {
    const stageDesc = 
      pct <= 10 ? 'Site Inspection & Assessment' :
      pct <= 25 ? 'In Investigation & Work Plan' :
      pct <= 50 ? 'Halfway Resolved / Work in Progress' :
      pct <= 75 ? 'Finishing & Rectification Work' :
      pct <= 90 ? 'Final Inspection & Site Cleanup' : 'Completed';

    const descToSend = actionComment.trim() || `${stageDesc} (${pct}% completed)`;

    setUpdatingStatus('PROGRESS');
    try {
      let mediaUrl: string | null = null;
      if (proofFile) {
        mediaUrl = await uploadProofFile();
      }

      // Instant optimistic local update for the progress bar
      const newUpdateItem = {
        id: 'opt-' + Date.now(),
        complaintId,
        staffId: user?.id || '',
        progressPercentage: pct,
        description: descToSend,
        createdAt: new Date().toISOString(),
        staff: { name: user?.name || 'Field Staff' }
      };

      setComplaint(prev => {
        if (!prev) return null;
        return {
          ...prev,
          progressUpdates: [newUpdateItem, ...(prev.progressUpdates || [])]
        };
      });

      const res = await apiFetch(`/api/complaints/${complaintId}/progress`, {
        method: 'POST',
        body: JSON.stringify({
          progressPercentage: pct,
          description: descToSend,
          estimatedTimeframe,
          mediaUrl: mediaUrl || undefined
        })
      });

      if (res.ok) {
        setActionComment('');
        setProofFile(null);
        const fileInput = document.getElementById('proof-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        setProgressSuccessMsg(`Updated progress to ${pct}% successfully!`);
        setTimeout(() => setProgressSuccessMsg(null), 3000);
        await fetchComplaintDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handlePlaceOnHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdReason || !holdComment) return;

    setUpdatingStatus('HOLD');
    try {
      let mediaUrl: string | null = null;
      if (proofFile) {
        mediaUrl = await uploadProofFile();
      }

      const res = await apiFetch(`/api/complaints/${complaintId}/hold`, {
        method: 'POST',
        body: JSON.stringify({
          reason: holdReason,
          comment: holdComment,
          expectedRestartDate,
          mediaUrl: mediaUrl || undefined
        })
      });

      if (res.ok) {
        setHoldComment('');
        setProofFile(null);
        const fileInput = document.getElementById('proof-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        setShowHoldModal(false);
        await fetchComplaintDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleResumeTaskWork = async () => {
    setUpdatingStatus('RESUME');
    try {
      const res = await apiFetch(`/api/complaints/${complaintId}/resume`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchComplaintDetails();
      }
    } catch (err) {
      console.error('Failed to resume work:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleResolveTask = async () => {
    if (!actionComment.trim()) return;

    setUpdatingStatus('RESOLVE');
    try {
      let mediaUrl: string | null = null;
      if (proofFile) {
        mediaUrl = await uploadProofFile();
      }

      const res = await apiFetch(`/api/complaints/${complaintId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          resolutionDescription: actionComment,
          mediaUrl: mediaUrl || undefined
        })
      });

      if (res.ok) {
        setActionComment('');
        setProofFile(null);
        const fileInput = document.getElementById('proof-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        await fetchComplaintDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleReopenTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;

    setReopenLoading(true);
    try {
      const res = await apiFetch(`/api/complaints/${complaintId}/reopen`, {
        method: 'POST',
        body: JSON.stringify({
          comment: reopenReason
        })
      });

      if (res.ok) {
        setReopenReason('');
        setShowReopenForm(false);
        await fetchComplaintDetails();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReopenLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const res = await apiFetch('/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          complaintId,
          content: newComment,
          isInternal: isInternal && user?.role !== 'CITIZEN'
        })
      });

      if (res.ok) {
        const comment = await res.json();
        setComplaint(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : null);
        setNewComment('');
        setIsInternal(false);
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const uploadProofFile = async (): Promise<string | null> => {
    if (!proofFile) return null;

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(proofFile);
      });

      const res = await apiFetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify({
          filename: proofFile.name,
          mimeType: proofFile.type,
          base64Data
        })
      });

      if (res.ok) {
        const data = await res.json();
        return data.fileUrl;
      }
    } catch (err) {
      console.error('Failed to upload proof file:', err);
    }
    return null;
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      const res = await apiFetch(`/api/complaints/${complaintId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rating,
          comment: feedbackComment
        })
      });

      if (res.ok) {
        setFeedbackComment('');
        await fetchComplaintDetails(); // Refresh layout details
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
        Retrieving incident file folder...
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <p>Complaint details could not be retrieved.</p>
        <button className="btn btn-primary" onClick={onBack}>Back to Dashboard</button>
      </div>
    );
  }

  const isCitizen = user?.role === 'CITIZEN';
  const isStaff = user?.role === 'STAFF';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'DEPARTMENT_ADMIN';
  const isAssignedStaff = Boolean(complaint.assignedStaff && user && user.id === complaint.assignedStaff.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Back button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ padding: '8px 14px' }}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
        {complaint.assignedStaff && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success-color)' }} />
            <span>Assigned Officer: <strong style={{ color: 'white' }}>{complaint.assignedStaff.name}</strong></span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 4fr', gap: '24px', alignItems: 'start' }}>
        {/* Left Side: details, timeline, comments, actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Main info card */}
          <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {complaint.complaintNumber}
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0 0', color: 'white' }}>{complaint.title}</h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <StatusBadge status={complaint.status} />
              </div>
            </div>

            <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {complaint.description}
            </p>

            {/* Media Attachment */}
            {complaint.media.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <FileImage size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Attached Document / Media
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {complaint.media.map(m => {
                    const isImg = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(
                      m.fileUrl.split('.').pop()?.toLowerCase() || ''
                    );
                    const cleanFilename = m.fileUrl.split('/').pop()?.replace(/^\d+_/g, '') || 'attachment';

                    return isImg ? (
                      <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" key={m.id}>
                        <img
                          src={m.fileUrl}
                          alt="Complaint attachment"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '220px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-glass)',
                            objectFit: 'cover'
                          }}
                        />
                      </a>
                    ) : (
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={m.id}
                        className="btn btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 18px',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: '#fff',
                          textDecoration: 'none',
                          backgroundColor: 'rgba(255,255,255,0.02)'
                        }}
                      >
                        📄 {cleanFilename} (Download File)
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Metadata grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px', fontSize: '0.82rem' }}>
              <div>
                Locality: <strong style={{ color: 'white' }}>{complaint.address}</strong>
              </div>
              <div>
                Category: <strong style={{ color: 'white' }}>{complaint.category?.name}</strong>
              </div>
              <div>
                Severity: <strong style={{ color: 'white' }}>{complaint.severity}</strong>
              </div>
              <div>
                Priority: <strong style={{ color: 'white' }}>{complaint.priority}</strong>
              </div>
            </div>
          </div>

          {/* Citizen Feedback Console */}
          {complaint.status === 'RESOLVED' && isCitizen && complaint.feedbacks.length === 0 && (
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--success-color)' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 10px 0', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={18} style={{ color: 'var(--success-color)' }} />
                Rate Incident Resolution
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                This ticket was marked resolved by the field staff. Please provide a rating and any comments to formally close this file, or reopen if unsatisfactorily completed.
              </p>

              <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rating:</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRating(star)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <Star
                          size={20}
                          fill={star <= rating ? 'var(--warning-color)' : 'none'}
                          color={star <= rating ? 'var(--warning-color)' : 'var(--text-secondary)'}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Feedback Comments</label>
                  <input
                    type="text"
                    placeholder="Describe your satisfaction with the response..."
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={submittingFeedback}
                    style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                  >
                    {submittingFeedback ? 'Submitting...' : 'Submit & Close Complaint'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowReopenForm(!showReopenForm)}
                    style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                  >
                    Reopen Complaint
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Citizen Reopen Form */}
          {((complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') && isCitizen && showReopenForm) && (
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--danger-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'white' }}>Reopen Complaint Ticket</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Please specify why the resolution was unsatisfactory so we can schedule corrective actions.</p>
              
              <form onSubmit={handleReopenTask} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="Enter reason for reopening (e.g. garbage pile was not fully cleared)..."
                  rows={3}
                  required
                  style={{ width: '100%', fontSize: '0.85rem' }}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={reopenLoading}
                  style={{ alignSelf: 'flex-start', padding: '8px 14px', fontSize: '0.8rem' }}
                >
                  {reopenLoading ? 'Reopening...' : 'Confirm Reopen'}
                </button>
              </form>
            </div>
          )}

          {/* Staff actions console */}
          {isStaff && isAssignedStaff && ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD'].includes(complaint.status) && (
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--primary-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'white' }}>
                Officer Work Console
              </h3>

              {/* Status specific buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {complaint.status === 'ASSIGNED' && (
                  <button
                    onClick={handleAcceptTask}
                    disabled={updatingStatus !== null}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                  >
                    {updatingStatus === 'ACCEPT' ? 'Accepting...' : 'Accept Assignment'}
                  </button>
                )}

                {complaint.status === 'ACCEPTED' && (
                  <button
                    onClick={handleStartTaskWork}
                    disabled={updatingStatus !== null}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                  >
                    {updatingStatus === 'START' ? 'Starting...' : 'Start Work (IN PROGRESS)'}
                  </button>
                )}

                {complaint.status === 'ON_HOLD' && (
                  <button
                    onClick={handleResumeTaskWork}
                    disabled={updatingStatus !== null}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                  >
                    {updatingStatus === 'RESUME' ? 'Resuming...' : 'Resume Work (IN PROGRESS)'}
                  </button>
                )}
              </div>

              {/* Progress Update Forms (Only if Active Work) */}
              {complaint.status === 'IN_PROGRESS' && (
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, color: 'white' }}>Update Work Progress</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '130px' }}>Progress Stage:</label>
                      <select
                        value={progressPct}
                        onChange={(e) => setProgressPct(e.target.value)}
                        style={{ padding: '6px', fontSize: '0.8rem', flex: 1 }}
                      >
                        <option value="10">10% - Site Inspection & Assessment</option>
                        <option value="25">25% - In Investigation & Work Plan</option>
                        <option value="50">50% - Halfway Resolved / Work in Progress</option>
                        <option value="75">75% - Finishing & Rectification Work</option>
                        <option value="90">90% - Final Inspection & Site Cleanup</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', width: '120px' }}>Resolution Timeframe:</label>
                      <select
                        value={estimatedTimeframe}
                        onChange={(e) => setEstimatedTimeframe(e.target.value)}
                        style={{ padding: '6px', fontSize: '0.8rem', flex: 1 }}
                      >
                        <option value="Within 1 to 2 Hours">Within 1 to 2 Hours</option>
                        <option value="Within 2 to 4 Hours">Within 2 to 4 Hours</option>
                        <option value="Today by 6:00 PM">Today by 6:00 PM</option>
                        <option value="Within 24 Hours">Within 24 Hours</option>
                        <option value="2 to 3 Days (Complex Work)">2 to 3 Days (Complex Work)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Work Notes for Citizen *</label>
                      <input
                        type="text"
                        placeholder="Detail the progress made (e.g. arranged tar mixture for road)..."
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Attach Progress Photo (Optional)</label>
                      <input
                        type="file"
                        id="proof-file-input"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        style={{ fontSize: '0.8rem', color: '#fff' }}
                      />
                    </div>

                    {/* Live Stack Progress Bar */}
                    <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>Current Live Stack Progress</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                          {complaint.progressUpdates && complaint.progressUpdates.length > 0 ? complaint.progressUpdates[0].progressPercentage : 0}%
                        </span>
                      </div>
                      
                      <div style={{ width: '100%', height: '10px', borderRadius: '5px', backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex' }}>
                        <div 
                          style={{ 
                            width: `${complaint.progressUpdates && complaint.progressUpdates.length > 0 ? complaint.progressUpdates[0].progressPercentage : 0}%`, 
                            height: '100%', 
                            background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #10b981 100%)', 
                            borderRadius: '5px',
                            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' 
                          }} 
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                        <span>0% Started</span>
                        <span>25% Investigating</span>
                        <span>50% Halfway</span>
                        <span>75% Finishing</span>
                        <span>100% Resolved</span>
                      </div>

                      {progressSuccessMsg && (
                        <div style={{ padding: '6px 10px', borderRadius: '6px', backgroundColor: 'rgba(16,185,129,0.15)', color: 'var(--success-color)', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>
                          ✓ {progressSuccessMsg}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      <button
                        onClick={() => handleProgressUpdate(parseInt(progressPct, 10))}
                        disabled={updatingStatus !== null}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        {updatingStatus === 'PROGRESS' ? 'Posting Update...' : 'Post Progress'}
                      </button>
                      <button
                        onClick={() => setShowHoldModal(true)}
                        className="btn btn-secondary"
                        style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                      >
                        Place ON HOLD
                      </button>
                    </div>
                  </div>

                  {/* Resolution submission console */}
                  <div style={{ borderTop: '1px dashed var(--border-glass)', paddingTop: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, color: 'var(--success-color)' }}>Final Resolution Submission</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>To mark the ticket as resolved, provide a final description and upload photographic proof.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Resolution Description *</label>
                      <textarea
                        placeholder="Detail final repairs done (e.g. filled pothole with quick-dry concrete)..."
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <button
                      onClick={handleResolveTask}
                      disabled={updatingStatus !== null}
                      className="btn btn-success"
                      style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '0.8rem', fontWeight: 650 }}
                    >
                      {updatingStatus === 'RESOLVE' ? 'Resolving...' : 'Complete & Resolve Problem'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hold Details Modal */}
          {showHoldModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <form onSubmit={handlePlaceOnHold} className="glass-panel" style={{ padding: '30px', width: '450px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'white' }}>Pause SLA & Hold Work</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Primary Reason for Hold *</label>
                  <select
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    style={{ padding: '6px' }}
                  >
                    <option value="Waiting for materials">Waiting for materials</option>
                    <option value="Severe Weather blockage">Severe Weather blockage</option>
                    <option value="Dependency on other department">Dependency on other department</option>
                    <option value="Equipment failure">Equipment failure</option>
                    <option value="Budget/approval delay">Budget/approval delay</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Comment Details *</label>
                  <textarea
                    placeholder="Provide details on dependency delay..."
                    value={holdComment}
                    onChange={(e) => setHoldComment(e.target.value)}
                    rows={3}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Expected Restart Date</label>
                  <input
                    type="date"
                    value={expectedRestartDate}
                    onChange={(e) => setExpectedRestartDate(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowHoldModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Confirm Hold</button>
                </div>
              </form>
            </div>
          )}

          {/* Comments section */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} style={{ color: 'var(--primary-color)' }} />
              Comments Thread
            </h3>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {complaint.comments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  No comments posted on this file yet.
                </div>
              ) : (
                complaint.comments.map(comment => (
                  <div
                    key={comment.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: comment.isInternal ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255,255,255,0.02)',
                      border: '1px solid',
                      borderColor: comment.isInternal ? 'rgba(245, 158, 11, 0.2)' : 'var(--border-glass)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>
                        {comment.user?.name || 'User'}{' '}
                        {comment.user?.role && (
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                            ({comment.user.role.replace(/_/g, ' ')})
                          </span>
                        )}
                      </span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {comment.isInternal && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.65rem', color: 'var(--warning-color)', backgroundColor: 'rgba(245,158,11,0.1)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                            <Lock size={8} /> INTERNAL
                          </span>
                        )}
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Comment form */}
            <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Post comment to this file thread..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{ flex: 1 }}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={commentLoading}
                  style={{ padding: '10px 14px' }}
                >
                  <Send size={16} />
                </button>
              </div>

              {user?.role !== 'CITIZEN' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    id="internal-chk"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="internal-chk" style={{ fontSize: '0.75rem', color: 'var(--warning-color)', cursor: 'pointer', userSelect: 'none', fontWeight: 550 }}>
                    Mark comment as internal (only visible to staff/admins)
                  </label>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Side: SLA Timer, custody logs, assignees, assignment panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Officer Resolution Timeframe & Updates Card */}
          <div 
            className="glass-panel" 
            style={{ 
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px',
              borderLeft: '4px solid var(--primary-color)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'white' }}>Resolution Timeframe</h3>
              <StatusBadge status={complaint.status} />
            </div>

            <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ⏱️ Expected Completion Window
              </h4>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                {complaint.status === 'RESOLVED' || complaint.status === 'CLOSED'
                  ? 'Resolved & Closed ✅'
                  : complaint.assignedStaff
                  ? 'Within 2 to 4 Hours'
                  : 'Pending Officer Assignment'}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.3 }}>
                {complaint.assignedStaff
                  ? `Officer ${complaint.assignedStaff.name} is handling this issue and sending real-time notifications.`
                  : 'The department is assigning a field officer to inspect and repair.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
              <div>
                Officer in Charge: <strong style={{ color: 'white' }}>{complaint.assignedStaff ? complaint.assignedStaff.name : 'Unassigned'}</strong>
              </div>
              <div>
                Current Status: <strong style={{ color: 'var(--primary-color)' }}>{complaint.status.replace(/_/g, ' ')}</strong>
              </div>

              {/* Live Stage & Progress Bar */}
              {complaint.progressUpdates && complaint.progressUpdates.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px', padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Live Work Progress</span>
                    <strong style={{ color: 'var(--primary-color)' }}>{complaint.progressUpdates[0].progressPercentage}%</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ width: `${complaint.progressUpdates[0].progressPercentage}%`, height: '100%', backgroundColor: 'var(--primary-color)', borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    Stage: <strong style={{ color: 'white' }}>{complaint.progressUpdates[0].description}</strong>
                  </span>
                </div>
              )}

              <div>
                Logged On: <strong style={{ color: 'white' }}>{new Date(complaint.createdAt).toLocaleDateString()}</strong>
              </div>
            </div>
          </div>

          {/* Team Custody Card */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Incident File Custody</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
              <div>
                Citizen Reporter: <strong style={{ color: 'white' }}>{complaint.citizen?.name}</strong>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{complaint.citizen?.email}</div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                Responsible Department: <strong style={{ color: 'white' }}>{complaint.assignedDepartment?.name || 'Unassigned'}</strong>
              </div>
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                Assigned Staff Officer:{' '}
                <strong style={{ color: 'white' }}>
                  {complaint.assignedStaff ? complaint.assignedStaff.name : 'Unassigned'}
                </strong>
                {complaint.assignedStaff && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {complaint.assignedStaff.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Admin Assign / Reassign Form */}
          {isAdmin && (
            <form onSubmit={handleAssign} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'white' }}>
                {complaint.assignedStaff ? 'Reassign Incident File' : 'Assign Incident File'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ color: 'var(--text-secondary)' }}>Department *</label>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ color: 'var(--text-secondary)' }}>Field Staff *</label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    required
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ color: 'var(--text-secondary)' }}>Priority</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ color: 'var(--text-secondary)' }}>Assignment Note</label>
                  <textarea
                    placeholder="Enter delegation directives..."
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={assignLoading}
                  style={{ marginTop: '4px' }}
                >
                  {assignLoading ? 'Saving Assignment...' : complaint.assignedStaff ? 'Confirm Reassign' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          )}

          {/* Status Timeline */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} style={{ color: 'var(--primary-color)' }} />
              Audit File Timeline
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '14px', borderLeft: '1px dashed var(--border-glass)' }}>
              {complaint.statusLogs.map((log) => (
                <div key={log.id} style={{ position: 'relative', fontSize: '0.78rem' }}>
                  {/* Pulsing point indicator on line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-20px',
                      top: '3px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-color)',
                      border: '2px solid #000'
                    }}
                  />

                  <div style={{ fontWeight: 650, color: 'white' }}>
                    {log.oldStatus.replace(/_/g, ' ')} &rarr; {log.newStatus.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '2px 0' }}>
                    Updated by: {log.user?.name || 'Staff'} {log.user?.role && `(${log.user.role.replace(/_/g, ' ')})`}
                  </div>
                  {log.comment && (
                    <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', paddingLeft: '6px', borderLeft: '2px solid rgba(255,255,255,0.08)', margin: '4px 0' }}>
                      &ldquo;{log.comment}&rdquo;
                    </div>
                  )}
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
