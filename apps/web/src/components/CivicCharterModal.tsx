import React from 'react';
import { X, ShieldCheck, Clock } from 'lucide-react';

interface CivicCharterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHARTER_SERVICES = [
  { dept: 'Water & Sewage (BWSSB)', issue: 'Severe Water Pipe Burst / Contamination', sla: '4 Hours', priority: 'CRITICAL', rule: 'Sec 14 Municipal Supply Act' },
  { dept: 'Electricity & Power (BESCOM)', issue: 'Fallen Wire / Transformer Shock Hazard', sla: '2 Hours', priority: 'EMERGENCY', rule: 'Disaster Safety Protocol' },
  { dept: 'Drainage Division', issue: 'Broken / Uncovered Stormwater Drain', sla: '6 Hours', priority: 'HIGH', rule: 'Pedestrian Safety Standard' },
  { dept: 'Solid Waste Management', issue: 'Public Garbage Dump Clearing', sla: '12 Hours', priority: 'MEDIUM', rule: 'Clean City Mandate' },
  { dept: 'Road Infrastructure', issue: 'Major Traffic Pothole Restoration', sla: '24 Hours', priority: 'HIGH', rule: 'Urban Road Standard' },
  { dept: 'Street Lighting Div', issue: 'Dark Corridor / Streetlight Blackout', sla: '24 Hours', priority: 'MEDIUM', rule: 'Night Safety Mandate' }
];

export const CivicCharterModal: React.FC<CivicCharterModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div 
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '680px',
          padding: '28px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <ShieldCheck size={24} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'white' }}>
              🏛️ Citizen Empowerment & SLA Charter
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Mandated Municipal Resolution Timelines & Citizen Rights Guarantee
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {CHARTER_SERVICES.map((srv, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-glass)',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--primary-color)', fontWeight: 700 }}>
                  {srv.dept}
                </span>
                <strong style={{ fontSize: '0.85rem', color: 'white' }}>
                  {srv.issue}
                </strong>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  Regulated under: {srv.rule}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  fontSize: '0.8rem',
                  fontWeight: 800
                }}>
                  <Clock size={12} />
                  {srv.sla} Max
                </span>
                <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 600 }}>
                  {srv.priority} Priority
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          <strong style={{ color: 'white' }}>Citizen Escalation Protocol:</strong> If a filed ticket exceeds the mandated SLA without an official reason, our automated AI engine auto-escalates custody to the Department Head and Super Administrator console.
        </div>
      </div>
    </div>
  );
};
