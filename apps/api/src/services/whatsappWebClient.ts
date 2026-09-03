import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

let client: Client | null = null;
let isClientReady = false;
let qrRawData: string | null = null;
let qrDataUrl: string | null = null;
let clientInitStarted = false;

function getAuthDirectory(): string {
  return path.resolve(__dirname, '../../.wwebjs_auth');
}

export const PERMANENT_WHATSAPP_NUMBER = process.env.OFFICIAL_WHATSAPP_NUMBER || '8374895670';

export function initWhatsAppWebClient() {
  if (clientInitStarted) return;
  clientInitStarted = true;

  try {
    const authPath = getAuthDirectory();
    console.log(`[WhatsAppWeb] Initializing Local WhatsApp Web Client at: ${authPath}`);
    console.log(`[WhatsAppWeb] Designated Official Permanent Number: +91 ${PERMANENT_WHATSAPP_NUMBER}`);

    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: authPath
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      }
    });

    client.on('qr', async (qr) => {
      qrRawData = qr;
      try {
        qrDataUrl = await QRCode.toDataURL(qr);
      } catch (err) {
        console.error('[WhatsAppWeb] Failed to generate QR data URL:', err);
      }

      console.log('\n========================================================================');
      console.log(`📲 [WHATSAPP-WEB] SCAN QR CODE TO LINK OFFICIAL NUMBER (+91 ${PERMANENT_WHATSAPP_NUMBER}):`);
      console.log('👉 Open your browser at: http://localhost:5000/whatsapp/qr');
      console.log('Or scan this QR directly in your terminal:');
      console.log('========================================================================\n');
      qrcodeTerminal.generate(qr, { small: true });
      console.log('\n========================================================================\n');
    });

    client.on('ready', () => {
      isClientReady = true;
      qrRawData = null;
      qrDataUrl = null;
      const connectedNumber = client?.info?.wid?.user || PERMANENT_WHATSAPP_NUMBER;
      const pushname = client?.info?.pushname || '';
      console.log('\n========================================================================');
      console.log(`✅ [WhatsAppWeb] WHATSAPP IS PERMANENTLY CONNECTED & READY!`);
      console.log(`📱 DEDICATED SENDER NUMBER: +${connectedNumber} ${pushname ? `(${pushname})` : ''}`);
      console.log(`🔒 ALL CIVIX CITIZEN ALERTS & SYSTEM UPDATES WILL DISPATCH FROM THIS NUMBER.`);
      console.log('========================================================================\n');
    });

    client.on('authenticated', () => {
      console.log('[WhatsAppWeb] WhatsApp Authenticated Successfully! Permanent session saved locally in .wwebjs_auth.');
    });

    client.on('auth_failure', (msg) => {
      console.error('[WhatsAppWeb] WhatsApp Authentication Failure:', msg);
      isClientReady = false;
      clientInitStarted = false;
    });

    client.on('disconnected', (reason) => {
      console.warn('[WhatsAppWeb] WhatsApp Client Disconnected (reason: ' + reason + '). Auto-reconnecting in 5s...');
      isClientReady = false;
      clientInitStarted = false;
      setTimeout(() => {
        if (!isClientReady) {
          console.log('[WhatsAppWeb] 🔄 Auto-reconnecting using persistent LocalAuth session...');
          initWhatsAppWebClient();
        }
      }, 5000);
    });

    client.initialize().catch((err) => {
      console.error('[WhatsAppWeb] Error during client.initialize():', err.message);
      clientInitStarted = false;
      setTimeout(() => {
        if (!isClientReady) {
          console.log('[WhatsAppWeb] 🔄 Retrying initialization with saved session...');
          initWhatsAppWebClient();
        }
      }, 8000);
    });
  } catch (err: any) {
    console.error('[WhatsAppWeb] Failed to start WhatsApp Web Client:', err.message);
    clientInitStarted = false;
  }
}

export function getWhatsAppStatus() {
  const connectedNumber = client?.info?.wid?.user || null;
  const pushname = client?.info?.pushname || null;
  return {
    isReady: isClientReady,
    connectedNumber,
    pushname,
    officialNumber: PERMANENT_WHATSAPP_NUMBER,
    hasQr: !!qrRawData,
    qrRaw: qrRawData,
    qrDataUrl
  };
}

export async function resetWhatsAppSession(): Promise<{ success: boolean; message: string }> {
  console.log('[WhatsAppWeb] 🔄 Resetting WhatsApp session & clearing session locks...');
  isClientReady = false;
  qrRawData = null;
  qrDataUrl = null;
  clientInitStarted = false;

  if (client) {
    try {
      await client.destroy();
    } catch (e: any) {
      console.warn('[WhatsAppWeb] Warning during client.destroy():', e.message);
    }
    client = null;
  }

  const authPath = getAuthDirectory();
  try {
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log('[WhatsAppWeb] Cleared .wwebjs_auth directory successfully.');
    }
  } catch (err: any) {
    console.warn('[WhatsAppWeb] Stale lock cleanup note:', err.message);
  }

  setTimeout(() => {
    initWhatsAppWebClient();
  }, 1000);

  return { success: true, message: 'WhatsApp session reset initiated. Generating new QR code...' };
}

export async function sendViaWhatsAppWeb(
  recipientPhone: string,
  message: string,
  retryCount = 0
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!client || !isClientReady) {
    return { success: false, error: 'WhatsApp Web client is not ready. Please scan QR code at http://localhost:5000/whatsapp/qr' };
  }

  try {
    // Digits only
    let cleanNumber = recipientPhone.replace(/[^0-9]/g, '').replace(/^0+/, '');
    if (cleanNumber.length === 10) {
      cleanNumber = `91${cleanNumber}`;
    }

    const targetChatId = `${cleanNumber}@c.us`;

    const senderNumber = client?.info?.wid?.user || 'Linked Account';
    console.log(`[WhatsAppWeb] 🚀 Dispatching live direct message from +${senderNumber} to recipient ${targetChatId} (${cleanNumber})...`);
    
    // Fast promise race to prevent hanging
    const sendPromise = client.sendMessage(targetChatId, message);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('WhatsApp Web sendMessage timeout (8s)')), 8000)
    );

    const sentMsg: any = await Promise.race([sendPromise, timeoutPromise]);
    const msgId = sentMsg?.id?.id || 'sent';
    console.log(`[WhatsAppWeb] ✅ Message DELIVERED from +${senderNumber} to ${cleanNumber}! ID: ${msgId}`);
    return { success: true, id: msgId };
  } catch (err: any) {
    console.warn(`[WhatsAppWeb] Warning on send to ${recipientPhone} (attempt ${retryCount + 1}):`, err.message);
    if (retryCount < 2 && client && isClientReady) {
      console.log(`[WhatsAppWeb] 🔄 Retrying dispatch in 1.2s...`);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return sendViaWhatsAppWeb(recipientPhone, message, retryCount + 1);
    }
    return { success: false, error: err.message };
  }
}

