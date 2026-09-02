import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getColors = () => {
    switch (status) {
      case 'DRAFT':
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.3)' };
      case 'SUBMITTED':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#93c5fd', border: 'rgba(59, 130, 246, 0.3)' };
      case 'UNDER_AI_ANALYSIS':
        return { bg: 'rgba(168, 85, 247, 0.15)', text: '#d8b4fe', border: 'rgba(168, 85, 247, 0.3)' };
      case 'PENDING_VERIFICATION':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fde047', border: 'rgba(245, 158, 11, 0.3)' };
      case 'VERIFIED':
        return { bg: 'rgba(6, 182, 212, 0.15)', text: '#67e8f9', border: 'rgba(6, 182, 212, 0.3)' };
      case 'REJECTED':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.3)' };
      case 'ASSIGNED':
        return { bg: 'rgba(99, 102, 241, 0.15)', text: '#c7d2fe', border: 'rgba(99, 102, 241, 0.3)' };
      case 'ACCEPTED':
        return { bg: 'rgba(79, 70, 229, 0.15)', text: '#c7d2fe', border: 'rgba(79, 70, 229, 0.3)' };
      case 'IN_PROGRESS':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)' };
      case 'ON_HOLD':
        return { bg: 'rgba(120, 113, 108, 0.15)', text: '#d6d3d1', border: 'rgba(120, 113, 108, 0.3)' };
      case 'RESOLVED':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#6ee7b7', border: 'rgba(16, 185, 129, 0.3)' };
      case 'CLOSED':
        return { bg: 'rgba(15, 118, 110, 0.15)', text: '#99f6e4', border: 'rgba(15, 118, 110, 0.3)' };
      case 'REOPENED':
        return { bg: 'rgba(219, 39, 119, 0.15)', text: '#fbcfe8', border: 'rgba(219, 39, 119, 0.3)' };
      case 'NOT_STARTED':
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#cbd5e1', border: 'rgba(148, 163, 184, 0.3)' };
      case 'ON_TRACK':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'DUE_SOON':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
      case 'OVERDUE':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
      case 'RESOLVED_ON_TIME':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'RESOLVED_LATE':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  const colors = getColors();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        fontSize: '0.75rem',
        fontWeight: 600,
        borderRadius: '9999px',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        letterSpacing: '0.05em'
      }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};
