import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertOctagon, X, Check } from 'lucide-react';

interface EmergencySOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMERGENCY_TYPES = [
  { id: 'LIVE_WIRE', label: '⚡ Live Fallen Electric Wire', desc: 'Active electric shock hazard on road/footpath', dept: 'Electricity Board', severity: 'CRITICAL' },
  { id: 'OPEN_MANHOLE', label: '🕳️ Open / Broken Deep Manhole', desc: 'Uncovered storm drain posing life hazard', dept: 'Drainage & Sewage', severity: 'CRITICAL' },
  { id: 'GAS_LEAK', label: '☣️ Gas / Pipeline Rupture', desc: 'Strong gas smell or major pipe leakage', dept: 'Emergency Ops', severity: 'CRITICAL' },
  { id: 'ROAD_COLLAPSE', label: '🚧 Road Cave-in / Tree Fall Blockage', desc: 'Entire road blocked or major cave-in', dept: 'Road Infrastructure', severity: 'HIGH' }
];

export const EmergencySOSModal: React.FC<EmergencySOSModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { apiFetch, user } = useAuth();
  const [selectedType, setSelectedType] = useState(EMERGENCY_TYPES[0]);
  const [landmark, setLandmark] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmergencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!landmark.trim()) {
      setError('Please provide the emergency location or landmark.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch departments to find match
      const deptRes = await apiFetch('/api/departments');
      let catId = '';
      if (deptRes.ok) {
        const depts = await deptRes.json();
        if (depts.length > 0 && depts[0].categories.length > 0) {
          catId = depts[0].categories[0].id;
        }
      }

      const res = await apiFetch('/api/complaints', {
        method: 'POST',
        body: JSON.stringify({
          title: `[EMERGENCY SOS] ${selectedType.label}`,
          description: `EMERGENCY CIVIC HAZARD DISPATCH: ${selectedType.desc}. Location Details: ${landmark}. Reported By: ${user?.name || 'Citizen'}. Auto-triaged for immediate 1-Hour SLA response.`,
          categoryId: catId,
          address: landmark,
          latitude: 12.971598,
          longitude: 77.594562
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onSuccess();
          onClose();
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to dispatch SOS complaint.');
      }
    } catch (err) {
      setError('Network connection error during emergency dispatch.');
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: '520px',
          padding: '28px',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 0 40px rgba(239, 68, 68, 0.25)',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(239, 68, 68, 0.4)'
          }}>
            <AlertOctagon size={24} style={{ color: '#ef4444' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'white' }}>
              🚨 Emergency Civic Hazard SOS
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#fca5a5', fontWeight: 600 }}>
              Expedited 1-Hour Rapid Municipal Dispatch Protocol
            </span>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', fontSize: '0.8rem', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ padding: '30px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #10b981' }}>
              <Check size={26} style={{ color: '#10b981' }} />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>Emergency SOS Dispatched!</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              Field rapid-response crew and municipal disaster desk have been alerted with Top Priority.
            </p>
          </div>
        ) : (
          <form onSubmit={handleEmergencySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Select Critical Hazard Type *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {EMERGENCY_TYPES.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: selectedType.id === type.id ? '1px solid #ef4444' : '1px solid var(--border-glass)',
                      backgroundColor: selectedType.id === type.id ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Exact Location / Landmark / Ward *
              </label>
              <input
                type="text"
                placeholder="e.g. Corner of 80ft road near SBI ATM, Indiranagar"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                required
              />
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.72rem', color: '#fca5a5', lineHeight: 1.4 }}>
              ⚡ <strong>Empowered Response Guarantee:</strong> Emergency SOS tickets bypass regular queue and trigger an instant broadcast alert to department administrators and field response officers.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-danger"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '0.9rem',
                fontWeight: 700,
                backgroundColor: '#ef4444',
                color: 'white',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
              }}
            >
              {loading ? 'Transmitting Rapid SOS...' : '🚨 Broadcast Emergency SOS Now'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
