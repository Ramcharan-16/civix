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

export function initWhatsAppWebClient() {
  if (clientInitStarted) return;

  const isCloud = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  const explicitlyEnabled = process.env.ENABLE_WHATSAPP_PUPPETEER === 'true';

  if (isCloud && !explicitlyEnabled) {
    console.log('[WhatsAppWeb] Running in cloud environment. Puppeteer WhatsApp-Web client bypassed to optimize memory (using instant Green-API / Twilio direct API).');
    return;
  }

  clientInitStarted = true;

  try {
    const authPath = getAuthDirectory();
    console.log(`[WhatsAppWeb] Initializing Local WhatsApp Web Client at: ${authPath}`);

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
          '--disable-gpu'
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
      console.log('📲 [WHATSAPP-WEB] SCAN QR CODE TO ACTIVATE UNLIMITED MESSAGING:');
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
      console.log('\n========================================================================');
      console.log('✅ [WhatsAppWeb] WHATSAPP IS CONNECTED & READY! UNLIMITED MESSAGING ACTIVE.');
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
  return {
    isReady: isClientReady,
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
  message: string
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

    let targetChatId = `${cleanNumber}@c.us`;

    try {
      if (typeof client.getNumberId === 'function') {
        const numberDetails = await client.getNumberId(cleanNumber);
        if (numberDetails && numberDetails._serialized) {
          // If WhatsApp returned an internal LID (@lid), preserve direct phone delivery via @c.us
          if (numberDetails._serialized.endsWith('@lid')) {
            targetChatId = `${cleanNumber}@c.us`;
          } else {
            targetChatId = numberDetails._serialized;
          }
        }
      }
    } catch (e: any) {
      console.warn(`[WhatsAppWeb] getNumberId notice for ${cleanNumber}:`, e.message);
      targetChatId = `${cleanNumber}@c.us`;
    }

    console.log(`[WhatsAppWeb] 🚀 Dispatching live direct chat message to ${targetChatId} (${cleanNumber}) via WhatsApp Web Client...`);
    
    const sentMsg = await client.sendMessage(targetChatId, message);
    const msgId = sentMsg?.id?.id || 'sent';
    console.log(`[WhatsAppWeb] ✅ Message DELIVERED to ${cleanNumber}! ID: ${msgId}`);
    return { success: true, id: msgId };
  } catch (err: any) {
    console.error(`[WhatsAppWeb] Failed to send to ${recipientPhone}:`, err.message);
    return { success: false, error: err.message };
  }
}

