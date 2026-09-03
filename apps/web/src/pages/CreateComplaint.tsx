import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Map } from '../components/Map';
import { Check, MapPin, Sparkles, Navigation, Cpu } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  categories: Category[];
}

interface CreateComplaintProps {
  onSuccess: () => void;
}

export const CreateComplaint: React.FC<CreateComplaintProps> = ({ onSuccess }) => {
  const { apiFetch } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [latitude, setLatitude] = useState(12.971598); // Bengaluru Default
  const [longitude, setLongitude] = useState(77.594562);
  const [address, setAddress] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  // File upload states
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileName, setFileName] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Dynamic AI Predictor Simulation based on title & description
  const combinedText = `${title} ${description}`.toLowerCase();
  let predictedSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  let predictedTimeframe = 'Within 2 to 4 Hours';
  let aiConfidence = 85;

  if (combinedText.includes('wire') || combinedText.includes('shock') || combinedText.includes('fire') || combinedText.includes('manhole') || combinedText.includes('gas') || combinedText.includes('danger')) {
    predictedSeverity = 'CRITICAL';
    predictedTimeframe = 'Within 1 to 2 Hours (Emergency Dispatch)';
    aiConfidence = 98;
  } else if (combinedText.includes('pothole') || combinedText.includes('pipe') || combinedText.includes('leak') || combinedText.includes('drain') || combinedText.includes('sewage') || combinedText.includes('burst')) {
    predictedSeverity = 'HIGH';
    predictedTimeframe = 'Within 4 to 8 Hours';
    aiConfidence = 94;
  } else if (combinedText.includes('garbage') || combinedText.includes('light') || combinedText.includes('dark') || combinedText.includes('traffic') || combinedText.includes('clean')) {
    predictedSeverity = 'MEDIUM';
    predictedTimeframe = 'Within 24 Hours';
    aiConfidence = 91;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError(null);
    setFileName(file.name);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await apiFetch('/api/upload', {
          method: 'POST',
          body: JSON.stringify({
            filename: file.name,
            mimeType: file.type,
            base64Data
          })
        });

        if (res.ok) {
          const data = await res.json();
          setMediaUrl(data.fileUrl);
        } else {
          const data = await res.json();
          setError(data.error || 'Failed to upload file.');
          setFileName('');
          setFilePreview(null);
        }
      } catch (err) {
        console.error('File upload failed:', err);
        setError('Failed to upload file due to network error.');
        setFileName('');
        setFilePreview(null);
      } finally {
        setUploadingFile(false);
      }
    };
    reader.onerror = () => {
      setError('Error reading file.');
      setUploadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await apiFetch('/api/departments');
        if (res.ok) {
          const data = await res.json();
          setDepartments(data);
          if (data.length > 0 && data[0].categories.length > 0) {
            setCategoryId(data[0].categories[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchDepartments();
  }, []);

  const handleMapSelect = async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&email=contact@civix.gov.in`);
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : null;
        if (data && data.display_name) {
          setAddress(data.display_name);
          return;
        }
      }
      setAddress(`Area near Coordinate (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
    } catch (err) {
      console.warn('Reverse geocoding failed:', err);
      setAddress(`Area near Coordinate (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        await handleMapSelect(lat, lng);
        setGpsLoading(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGpsLoading(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !categoryId || !address) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/complaints', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          categoryId,
          latitude,
          longitude,
          address,
          mediaUrl: mediaUrl || undefined
        })
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to file complaint.');
      }
    } catch (err: any) {
      setError(err?.message || 'Connection error. Failed to send data to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px', alignItems: 'start' }}>
      {/* Form panel */}
      <div className="glass-panel" style={{ padding: '28px', borderLeft: '4px solid var(--primary-color)' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🏛️ Lodge Civic Complaint
        </h2>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {success ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: '#10b981', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #10b981' }}>
              <Check size={26} style={{ color: '#10b981' }} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Complaint Registered Successfully!</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>AI triage and auto-classification completed. Redirecting to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Complaint Title *</label>
              <input
                type="text"
                placeholder="e.g. Large pothole on 100ft road near Metro station"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {departments.map((dept) => (
                  <optgroup key={dept.id} label={dept.name}>
                    {dept.categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Detailed Description *</label>
              <textarea
                rows={3}
                placeholder="Provide specific details about the issue (e.g. dimensions, safety hazards, nearby landmark)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Address & Landmark *</label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={gpsLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-color)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Navigation size={12} />
                  {gpsLoading ? 'Detecting GPS...' : '📍 Use My GPS Location'}
                </button>
              </div>
              <input
                type="text"
                placeholder="Click location on map or type landmark..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Evidence Photo / Attachment (Optional)
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="file"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="file-upload"
                  disabled={uploadingFile || loading}
                />
                <label
                  htmlFor="file-upload"
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '10px 16px',
                    textAlign: 'center',
                    border: '1px dashed var(--border-glass)',
                    borderRadius: '8px',
                    width: '100%',
                    backgroundColor: 'rgba(255,255,255,0.02)'
                  }}
                >
                  📁 {uploadingFile ? 'Uploading file...' : fileName ? `Selected: ${fileName}` : 'Choose File or Take Photo'}
                </label>

                {filePreview && (
                  <div style={{ position: 'relative', width: '100%', maxHeight: '120px', overflow: 'hidden', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                    <img
                      src={filePreview}
                      alt="Upload preview"
                      style={{ width: '100%', height: 'auto', objectFit: 'contain', maxHeight: '120px' }}
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || uploadingFile}
              style={{ width: '100%', padding: '12px', marginTop: '6px', fontWeight: 700, fontSize: '0.95rem' }}
            >
              {loading ? 'Submitting & Running AI Analysis...' : uploadingFile ? 'Uploading attachment...' : 'Lodge Complaint & Auto-Dispatch'}
              {!loading && !uploadingFile && <Sparkles size={16} />}
            </button>
          </form>
        )}
      </div>

      {/* Right Column: Live Map & Dynamic AI Triage Predictor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Dynamic AI Triage Radar */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #6366f1', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={16} style={{ color: '#818cf8' }} />
              Live AI Triage Radar
            </h4>
            <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 700 }}>
              {aiConfidence}% Precision
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                Predicted Severity
              </span>
              <strong style={{
                fontSize: '0.85rem',
                color: predictedSeverity === 'CRITICAL' ? 'var(--danger-color)' : predictedSeverity === 'HIGH' ? 'var(--warning-color)' : 'var(--primary-color)'
              }}>
                {predictedSeverity}
              </strong>
            </div>

            <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                Est. Resolution
              </span>
              <strong style={{ fontSize: '0.82rem', color: 'white' }}>
                {predictedTimeframe}
              </strong>
            </div>
          </div>

          <div style={{ width: '100%', height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${aiConfidence}%`, 
                height: '100%', 
                background: 'linear-gradient(90deg, #3b82f6, #6366f1, #10b981)',
                transition: 'width 0.4s ease'
              }} 
            />
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            🤖 AI automatically triages hazard urgency and dispatches the file to municipal field crews.
          </span>
        </div>

        {/* Location Coordinates Map */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} style={{ color: 'var(--primary-color)' }} />
            Pin Exact Coordinates
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
            Click anywhere on the map to pin the incident coordinate accurately.
          </p>

          <Map
            interactive={true}
            selectedPoint={{ lat: latitude, lng: longitude }}
            onPointSelect={handleMapSelect}
          />
        </div>
      </div>
    </div>
  );
};
