import dotenv from 'dotenv';
import path from 'path';

// Load env files
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import app from './app';
import { startSlaScheduler } from './services/slaScheduler';
import { initWhatsAppWebClient } from './services/whatsappWebClient';

// Handle uncaught exceptions gracefully (e.g. Windows file locks in Chromium / whatsapp-web session)
process.on('uncaughtException', (err: any) => {
  if (err?.code === 'EBUSY' || err?.message?.includes('.wwebjs_auth') || err?.message?.includes('first_party_sets')) {
    console.warn('[Process] Suppressed Windows file-lock warning in background session:', err.message);
    return;
  }
  console.error('[Process Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason: any) => {
  if (reason?.code === 'EBUSY' || reason?.message?.includes('.wwebjs_auth') || reason?.message?.includes('first_party_sets')) {
    console.warn('[Process] Suppressed Windows file-lock warning in background session:', reason?.message);
    return;
  }
  console.error('[Process Unhandled Rejection]', reason);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend API Server running on port ${PORT}`);
  // Start the periodic SLA checking scheduler daemon
  startSlaScheduler();
  // Initialize Local WhatsApp Web Client for 100% Free Unlimited Messaging
  initWhatsAppWebClient();
});
