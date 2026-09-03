import express from 'express';
import cors from 'cors';
import path from 'path';
import authRouter from './routes/auth';
import complaintsRouter from './routes/complaints';
import departmentsRouter from './routes/departments';
import usersRouter from './routes/users';
import commentsRouter from './routes/comments';
import notificationsRouter from './routes/notifications';
import statsRouter from './routes/stats';
import uploadRouter from './routes/upload';
import adminRouter from './routes/admin';

const app: express.Express = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files statically
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));
app.use('/api/uploads', express.static(uploadsPath));

// Routes registration (supports both /route and /api/route)
app.use('/auth', authRouter);
app.use('/api/auth', authRouter);

app.use('/complaints', complaintsRouter);
app.use('/api/complaints', complaintsRouter);

app.use('/departments', departmentsRouter);
app.use('/api/departments', departmentsRouter);

app.use('/users', usersRouter);
app.use('/api/users', usersRouter);

app.use('/comments', commentsRouter);
app.use('/api/comments', commentsRouter);

app.use('/notifications', notificationsRouter);
app.use('/api/notifications', notificationsRouter);

app.use('/stats', statsRouter);
app.use('/api/stats', statsRouter);

app.use('/upload', uploadRouter);
app.use('/api/upload', uploadRouter);

app.use('/admin', adminRouter);
app.use('/api/admin', adminRouter);

import { getWhatsAppStatus, resetWhatsAppSession } from './services/whatsappWebClient';
import { sendWhatsAppDirectMessage } from './services/externalMessaging';

// WhatsApp Connection Status & QR Code Viewer
app.get(['/whatsapp/status', '/api/whatsapp/status'], (req, res) => {
  const status = getWhatsAppStatus();
  res.json(status);
});

// WhatsApp Live Test Dispatch Route
app.all(['/whatsapp/send-test', '/api/whatsapp/send-test'], async (req, res) => {
  const phone = (req.query.phone || req.body?.phone || '9014749680') as string;
  const message = (req.query.message || req.body?.message || '🏛️ Civix Live Test Alert: Official WhatsApp messaging is active & verified!') as string;
  const result = await sendWhatsAppDirectMessage(phone, message, 'Test User');
  res.json({ targetPhone: phone, result });
});

// Reset WhatsApp Session (Clears stale device locks for linking new phone numbers)
app.all(['/whatsapp/reset', '/api/whatsapp/reset'], async (req, res) => {
  const result = await resetWhatsAppSession();
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    res.redirect('/whatsapp/qr');
    return;
  }
  res.json(result);
});

// WhatsApp Interactive Browser QR Code Page & Live Console
app.get(['/whatsapp/qr', '/api/whatsapp/qr'], (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Civix WhatsApp Web Gateway</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: #090d16;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 24px 16px;
        }
        .container {
          background: #131b2e;
          border: 1px solid #1e293b;
          border-radius: 20px;
          padding: 36px 32px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        }
        .brand-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .brand-logo {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }
        .brand-title {
          font-size: 20px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.5px;
        }
        .brand-sub {
          font-size: 11px;
          font-weight: 600;
          color: #10b981;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        .badge-ready { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-qr { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .badge-init { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
        
        .qr-box {
          background: white;
          padding: 16px;
          border-radius: 16px;
          display: inline-block;
          margin: 10px 0 20px 0;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .qr-box img { width: 240px; height: 240px; display: block; }
        
        .instructions {
          background: #0b1120;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 16px;
          text-align: left;
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .instructions ol { margin: 6px 0 0 0; padding-left: 20px; }
        .instructions li { margin-bottom: 4px; }
        
        .action-btns {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
        .btn {
          padding: 10px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;
          transition: all 0.2s ease;
        }
        .btn-reset {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .btn-reset:hover { background: rgba(239, 68, 68, 0.25); }
        .btn-test {
          background: #10b981;
          color: #ffffff;
        }
        .btn-test:hover { background: #059669; }
        
        .test-panel {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #1e293b;
          text-align: left;
        }
        .test-panel label { font-size: 12px; font-weight: 600; color: #94a3b8; display: block; margin-bottom: 6px; }
        .test-panel input {
          width: 100%;
          padding: 10px 14px;
          background: #0b1120;
          border: 1px solid #334155;
          border-radius: 8px;
          color: white;
          font-size: 13px;
          margin-bottom: 10px;
          outline: none;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255,255,255,0.1);
          border-left-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 30px auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="container" id="app-container">
        <div class="brand-header">
          <div class="brand-logo">💬</div>
          <div style="text-align: left;">
            <div class="brand-title">Civix WhatsApp Link</div>
            <div class="brand-sub">Real-Time Grievance Dispatcher</div>
          </div>
        </div>

        <div id="content-slot">
          <div class="spinner"></div>
          <p style="color: #94a3b8; font-size: 14px;">Connecting to WhatsApp client...</p>
        </div>
      </div>

      <script>
        let currentReadyState = null;
        let lastQrRaw = null;

        async function updateStatus() {
          try {
            const res = await fetch('/api/whatsapp/status');
            const data = await res.json();
            const slot = document.getElementById('content-slot');

            if (data.isReady) {
              if (currentReadyState !== true || data.connectedNumber) {
                currentReadyState = true;
                const senderDisplay = data.connectedNumber ? \`+\${data.connectedNumber}\` : 'Linked Device';
                const nameDisplay = data.pushname ? \` (\${data.pushname})\` : '';
                slot.innerHTML = \`
                  <div class="status-badge badge-ready">● ACTIVE & LINKED: \${senderDisplay}</div>
                  <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 6px;">WhatsApp Connected!</h2>
                  <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 12px; margin-bottom: 18px;">
                    <div style="font-size: 11px; color: #6ee7b7; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Active Sending Number</div>
                    <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-top: 2px;">\${senderDisplay}\${nameDisplay}</div>
                    <div style="font-size: 12px; color: #a7f3d0; margin-top: 4px;">All Civix notifications will be sent directly from this number.</div>
                  </div>
                  <div class="test-panel">
                    <label>Send Quick Live Test Alert from \${senderDisplay}:</label>
                    <input type="tel" id="testPhone" placeholder="Recipient Phone (e.g. 8374895670)" value="8374895670" />
                    <button class="btn btn-test" style="width: 100%; justify-content: center;" onclick="sendTestMessage()">
                      🚀 Dispatch Test Message via \${senderDisplay}
                    </button>
                    <div id="testOutput" style="font-size: 12px; margin-top: 8px; color: #34d399;"></div>
                  </div>
                  <div style="margin-top: 24px;">
                    <button class="btn btn-reset" onclick="triggerReset()">🔄 Switch / Re-link Different Number</button>
                  </div>
                \`;
              }
            } else if (data.qrDataUrl) {
              if (lastQrRaw !== data.qrRaw || currentReadyState !== false) {
                currentReadyState = false;
                lastQrRaw = data.qrRaw;
                slot.innerHTML = \`
                  <div class="status-badge badge-qr">📷 WAITING FOR SCAN</div>
                  <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 6px;">Scan to Link WhatsApp</h2>
                  <p style="color: #94a3b8; font-size: 13px; margin-bottom: 12px;">Scan the QR code below using your mobile WhatsApp.</p>
                  
                  <div class="qr-box">
                    <img src="\${data.qrDataUrl}" alt="WhatsApp QR Code" />
                  </div>

                  <div class="instructions">
                    <strong>Steps to connect:</strong>
                    <ol>
                      <li>Open <strong>WhatsApp</strong> on your phone</li>
                      <li>Tap <strong>Settings</strong> or <strong>Menu (⋮)</strong></li>
                      <li>Tap <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong></li>
                      <li>Point camera at the QR code above</li>
                    </ol>
                  </div>

                  <div class="action-btns">
                    <button class="btn btn-reset" onclick="triggerReset()">🔄 Refresh / Generate Fresh QR</button>
                  </div>
                \`;
              }
            } else {
              currentReadyState = 'init';
              slot.innerHTML = \`
                <div class="status-badge badge-init">⚡ INITIALIZING</div>
                <div class="spinner"></div>
                <p style="color: #94a3b8; font-size: 14px; margin-bottom: 16px;">Starting WhatsApp Web engine & generating instant QR...</p>
                <button class="btn btn-reset" onclick="triggerReset()">Force Regenerate QR</button>
              \`;
            }
          } catch (e) {
            console.error('Status poll error:', e);
          }
        }

        async function triggerReset() {
          const slot = document.getElementById('content-slot');
          slot.innerHTML = \`
            <div class="spinner"></div>
            <p style="color: #cbd5e1; font-size: 14px;">Resetting session and preparing brand new QR code...</p>
          \`;
          await fetch('/api/whatsapp/reset');
          setTimeout(updateStatus, 1500);
        }

        async function sendTestMessage() {
          const phone = document.getElementById('testPhone').value;
          const out = document.getElementById('testOutput');
          if (!phone) return;
          out.innerHTML = 'Sending...';
          try {
            const res = await fetch(\`/api/whatsapp/send-test?phone=\${encodeURIComponent(phone)}\`);
            const data = await res.json();
            if (data.result && data.result.success) {
              out.innerHTML = \`✅ Message sent successfully to \${phone}! ID: \${data.result.sid || 'Delivered'}\`;
            } else {
              out.innerHTML = \`❌ Error: \${data.result?.error || 'Failed to send'}\`;
            }
          } catch (e) {
            out.innerHTML = '❌ Error sending message: ' + e.message;
          }
        }

        setInterval(updateStatus, 2000);
        updateStatus();
      </script>
    </body>
    </html>
  `);
});

// Root service index
app.get(['/', '/api'], (req, res) => {
  res.json({
    service: 'Civix Municipal Grievance Platform API',
    status: 'online',
    version: '1.0.0',
    time: new Date()
  });
});

// Health check
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', service: 'civix-api', time: new Date() });
});

// 404 JSON fallback for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global JSON error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Unhandled Error]', err);
  const status = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

export default app;
