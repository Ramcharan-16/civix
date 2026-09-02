import dotenv from 'dotenv';
import path from 'path';

// Load env files
dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import app from './app';
import { startSlaScheduler } from './services/slaScheduler';
import { initWhatsAppWebClient } from './services/whatsappWebClient';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend API Server running on port ${PORT}`);
  // Start the periodic SLA checking scheduler daemon
  startSlaScheduler();
  // Initialize Local WhatsApp Web Client for 100% Free Unlimited Messaging
  initWhatsAppWebClient();
});
