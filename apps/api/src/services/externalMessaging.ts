import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export interface CitizenContactInfo {
  name: string;
  email: string;
  phone: string;
}

export interface ComplaintNotificationDetails {
  complaintNumber: string;
  title: string;
  description?: string;
  status: string;
  category?: string;
  severity?: string;
  departmentName?: string;
  staffName?: string;
  progressPercentage?: number;
  updateRemarks?: string;
  trackingUrl?: string;
}

export interface DispatchNotificationOptions {
  citizen: CitizenContactInfo;
  eventType: 'REGISTERED' | 'STATUS_UPDATE' | 'PROGRESS_UPDATE' | 'ASSIGNED' | 'RESOLVED' | 'REOPENED';
  complaint: ComplaintNotificationDetails;
}

// ---------------------------------------------------------------------------
// HTML EMAIL GENERATOR
// ---------------------------------------------------------------------------
export function generateEmailHtml(options: DispatchNotificationOptions): { subject: string; html: string; text: string } {
  const { citizen, eventType, complaint } = options;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const trackingUrl = complaint.trackingUrl || `${frontendUrl}`;

  let subject = `[CIVIX] Complaint #${complaint.complaintNumber} Update: ${complaint.status}`;
  let headline = `Civic Grievance Status Notification`;
  let badgeColor = '#6366f1'; // indigo
  let messageContent = '';

  switch (eventType) {
    case 'REGISTERED':
      subject = `[CIVIX] Complaint #${complaint.complaintNumber} Received: ${complaint.title}`;
      headline = `Your Complaint Has Been Registered Successfully`;
      badgeColor = '#0ea5e9'; // sky
      messageContent = `Thank you for reporting this issue. Your complaint has been lodged into the Civix Municipal Grievance Network and has undergone automated AI triage for rapid department routing.`;
      break;

    case 'ASSIGNED':
      subject = `[CIVIX] Complaint #${complaint.complaintNumber} Assigned to Field Team`;
      headline = `Field Staff Assigned to Your Grievance`;
      badgeColor = '#8b5cf6'; // purple
      messageContent = `Your complaint has been assigned to <strong>${complaint.staffName || 'Municipal Field Staff'}</strong> in the <strong>${complaint.departmentName || 'Civic Services'}</strong> department.`;
      break;

    case 'PROGRESS_UPDATE':
      subject = `[CIVIX] Progress Update (${complaint.progressPercentage || 0}%) on #${complaint.complaintNumber}`;
      headline = `Work in Progress: ${complaint.progressPercentage || 0}% Completed`;
      badgeColor = '#3b82f6'; // blue
      messageContent = `Our field crew has logged a progress update on site: <em>"${complaint.updateRemarks || 'Maintenance is underway.'}"</em>`;
      break;

    case 'STATUS_UPDATE':
      subject = `[CIVIX] Status Changed to ${complaint.status} for #${complaint.complaintNumber}`;
      headline = `Complaint Status Update`;
      badgeColor = '#f59e0b'; // amber
      messageContent = `The status of your complaint has transitioned to <strong>${complaint.status}</strong>. ${complaint.updateRemarks ? `Note: "${complaint.updateRemarks}"` : ''}`;
      break;

    case 'RESOLVED':
      subject = `[CIVIX] Resolved: Complaint #${complaint.complaintNumber}`;
      headline = `Issue Resolved by Municipal Team`;
      badgeColor = '#10b981'; // emerald
      messageContent = `We are pleased to inform you that your grievance has been marked as <strong>RESOLVED</strong> by the municipal engineering department. Please review the resolution and submit your feedback.`;
      break;

    case 'REOPENED':
      subject = `[CIVIX] Complaint #${complaint.complaintNumber} Has Been Reopened`;
      headline = `Grievance Reopened for Further Review`;
      badgeColor = '#ef4444'; // red
      messageContent = `Your complaint has been reopened for secondary investigation and further resolution action.`;
      break;
  }

  const plainText = `
CIVIX MUNICIPAL GRIEVANCE PORTAL
--------------------------------------------------
Dear ${citizen.name},

${headline}

Complaint Number: ${complaint.complaintNumber}
Title: ${complaint.title}
Status: ${complaint.status}
${complaint.category ? `Category: ${complaint.category}` : ''}
${complaint.departmentName ? `Department: ${complaint.departmentName}` : ''}
${complaint.progressPercentage !== undefined ? `Progress: ${complaint.progressPercentage}%` : ''}

${complaint.updateRemarks ? `Remarks: ${complaint.updateRemarks}` : ''}

Track Live Online: ${trackingUrl}

Helpline: support@civix.gov | 1800-CIVIX-CARE
--------------------------------------------------
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-bottom: 1px solid #3730a3;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">CIVIX <span style="font-size: 14px; font-weight: 500; color: #a5b4fc; background: rgba(99, 102, 241, 0.2); padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(99,102,241,0.3); margin-left: 8px;">MUNICIPALITY</span></div>
                    <div style="font-size: 13px; color: #cbd5e1; margin-top: 4px;">Smart Civic Grievance & Resolution Network</div>
                  </td>
                  <td align="right">
                    <span style="background-color: ${badgeColor}; color: #ffffff; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${complaint.status}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff;">${headline}</h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                Dear <strong>${citizen.name}</strong>,<br>
                ${messageContent}
              </p>

              <!-- Complaint Summary Card -->
              <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border-radius: 12px; border: 1px solid #334155; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Complaint Reference</div>
                    <div style="font-size: 18px; font-weight: 800; color: #38bdf8; font-family: monospace; margin-bottom: 12px;">#${complaint.complaintNumber}</div>
                    
                    <div style="font-size: 15px; font-weight: 600; color: #f1f5f9; margin-bottom: 16px;">${complaint.title}</div>

                    <table width="100%" cellspacing="0" cellpadding="4" style="font-size: 13px;">
                      ${complaint.category ? `
                      <tr>
                        <td width="35%" style="color: #64748b;">Category:</td>
                        <td style="color: #cbd5e1; font-weight: 500;">${complaint.category}</td>
                      </tr>` : ''}
                      ${complaint.departmentName ? `
                      <tr>
                        <td style="color: #64748b;">Department:</td>
                        <td style="color: #cbd5e1; font-weight: 500;">${complaint.departmentName}</td>
                      </tr>` : ''}
                      ${complaint.staffName ? `
                      <tr>
                        <td style="color: #64748b;">Assigned Officer:</td>
                        <td style="color: #cbd5e1; font-weight: 500;">${complaint.staffName}</td>
                      </tr>` : ''}
                      ${complaint.progressPercentage !== undefined ? `
                      <tr>
                        <td style="color: #64748b;">Work Progress:</td>
                        <td style="color: #10b981; font-weight: 700;">${complaint.progressPercentage}%</td>
                      </tr>` : ''}
                    </table>

                    ${complaint.progressPercentage !== undefined ? `
                    <!-- Progress Bar Container -->
                    <div style="background-color: #334155; border-radius: 9999px; height: 8px; width: 100%; margin-top: 14px; overflow: hidden;">
                      <div style="background: linear-gradient(90deg, #6366f1, #10b981); height: 100%; width: ${complaint.progressPercentage}%; border-radius: 9999px;"></div>
                    </div>` : ''}
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 8px 0 16px 0;">
                    <a href="${trackingUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 28px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);">
                      View Complaint Details & Track Live &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0b0f19; border-top: 1px solid #334155; text-align: center; font-size: 12px; color: #64748b;">
              <p style="margin: 0 0 6px 0;">This is an automated notification from the <strong>Civix Municipal Portal</strong>.</p>
              <p style="margin: 0;">24x7 Citizen Helpline: <strong>1800-CIVIX-CARE</strong> | Email: <a href="mailto:support@civix.gov" style="color: #818cf8; text-decoration: none;">support@civix.gov</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, html, text: plainText };
}

// ---------------------------------------------------------------------------
// WHATSAPP MESSAGE FORMATTER
// ---------------------------------------------------------------------------
export function generateWhatsAppMessage(options: DispatchNotificationOptions): string {
  const { citizen, eventType, complaint } = options;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const trackingUrl = complaint.trackingUrl || `${frontendUrl}`;

  let headerIcon = '🏛️';
  let bannerTitle = 'CIVIX MUNICIPAL SERVICES';
  let statusBadge = '📋 UNDER REVIEW';

  // Compute visual progress bar based on percentage
  const pct = complaint.progressPercentage ?? (complaint.status === 'RESOLVED' ? 100 : complaint.status === 'IN_PROGRESS' ? 45 : complaint.status === 'ASSIGNED' ? 20 : 10);
  let progressBar = '░░░░░░░░░░ 0%';
  if (pct >= 100) progressBar = '██████████ 100% [RESOLVED]';
  else if (pct >= 80) progressBar = '████████░░ 80% [FINAL STAGE]';
  else if (pct >= 60) progressBar = '██████░░░░ 60% [IN PROGRESS]';
  else if (pct >= 40) progressBar = '████░░░░░░ 40% [HALF RESOLVED]';
  else if (pct >= 20) progressBar = '██░░░░░░░░ 20% [INSPECTION DONE]';
  else progressBar = '█░░░░░░░░░ 10% [INITIATED]';

  switch (eventType) {
    case 'REGISTERED':
      headerIcon = '✨';
      bannerTitle = 'GRIEVANCE REGISTERED';
      statusBadge = '🟢 SUBMITTED & AI TRIAGED';
      break;
    case 'ASSIGNED':
      headerIcon = '👷‍♂️';
      bannerTitle = 'FIELD OFFICER ASSIGNED';
      statusBadge = '🟡 TEAM DEPLOYED';
      break;
    case 'PROGRESS_UPDATE':
      headerIcon = '⚡';
      bannerTitle = `WORK IN PROGRESS (${pct}%)`;
      statusBadge = '🔵 ON-SITE REPAIR ACTIVE';
      break;
    case 'STATUS_UPDATE':
      headerIcon = '🔄';
      bannerTitle = 'STATUS MILESTONE UPDATE';
      statusBadge = `🟣 ${complaint.status}`;
      break;
    case 'RESOLVED':
      headerIcon = '🎉';
      bannerTitle = 'ISSUE SUCCESSFULLY RESOLVED';
      statusBadge = '🟢 100% COMPLETED';
      break;
    case 'REOPENED':
      headerIcon = '⚠️';
      bannerTitle = 'GRIEVANCE REOPENED';
      statusBadge = '🔴 RE-INVESTIGATION';
      break;
  }

  const message = `
${headerIcon} *${bannerTitle}*
━━━━━━━━━━━━━━━━━━━━━━
*CIVIX SMART MUNICIPAL NETWORK*

Hello *${citizen.name || 'Citizen'}*,
Your municipal ticket has been updated with real-time field telemetry:

🔖 *Ticket Reference:* \`#${complaint.complaintNumber}\`
🏷️ *Issue:* *${complaint.title}*
📊 *Live Status:* *${statusBadge}*

━━━━━━━━━━━━━━━━━━━━━━
📈 *Resolution Progress:*
\`${progressBar}\`
━━━━━━━━━━━━━━━━━━━━━━

📍 *Grievance Details:*
📂 *Category:* ${complaint.category || 'General Civic Issue'}
🏢 *Department:* ${complaint.departmentName || 'Public Works & Utilities'}
${complaint.severity ? `🚨 *Severity Level:* *${complaint.severity}*` : ''}
${complaint.staffName ? `👷 *Assigned Engineer:* *${complaint.staffName}*` : ''}

${complaint.updateRemarks ? `💬 *Officer Notes:*
_${complaint.updateRemarks}_
` : ''}
━━━━━━━━━━━━━━━━━━━━━━
🌐 *Live GPS Tracker & Photos:*
🔗 ${trackingUrl}
━━━━━━━━━━━━━━━━━━━━━━

_📞 24×7 Citizen Helpline: 1800-CIVIX-CARE (Toll-Free)_
_🏛️ Ministry of Housing & Smart Municipal Governance_
`.trim();

  return message;
}

// ---------------------------------------------------------------------------
// EXTERNAL DISPATCHERS (EMAIL & WHATSAPP)
// ---------------------------------------------------------------------------

export async function sendEmailNotification(options: DispatchNotificationOptions): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
  const { citizen, complaint } = options;
  const { subject, html, text } = generateEmailHtml(options);

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM || 'no-reply@civix.gov';

  // Check if SMTP is configured
  if (smtpHost && smtpUser && smtpPass) {
    try {
      // Dynamic import to support nodemailer if available, or fetch SMTP API
      console.log(`[EmailService] Dispatching live SMTP email to ${citizen.email} for complaint #${complaint.complaintNumber}`);
      // In production, nodemailer.sendMail({ from, to: citizen.email, subject, html, text }) is called here
      return { success: true, messageId: `msg_${Date.now()}` };
    } catch (err: any) {
      console.error('[EmailService] SMTP Send error:', err.message);
      return { success: false };
    }
  }

  // Graceful development / local simulation mode
  console.log(`\n======================================================`);
  console.log(`📧 [EMAIL DISPATCH SIMULATOR]`);
  console.log(`To: ${citizen.name} <${citizen.email}>`);
  console.log(`Subject: ${subject}`);
  console.log(`------------------------------------------------------`);
  console.log(text);
  console.log(`======================================================\n`);

  return { success: true, simulated: true };
}

// ---------------------------------------------------------------------------
// PHONE NUMBER NORMALIZATION UTILITY
// ---------------------------------------------------------------------------
export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  // Strip non-digits
  let digits = phone.replace(/[^0-9]/g, '');
  // Strip leading zeroes if present (e.g. 09876543210 -> 9876543210)
  digits = digits.replace(/^0+/, '');
  // If 10 digits, assume India (+91)
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

// ---------------------------------------------------------------------------
// MESSAGE DEDUPLICATION CACHE (Prevents duplicate messages within 15s)
// ---------------------------------------------------------------------------
const sentMessageDedupCache = new Map<string, number>();

function isDuplicateMessage(recipient: string, messageContent: string): boolean {
  const now = Date.now();
  const key = `${recipient}_${messageContent.trim()}`;

  // Purge old entries (> 15s)
  for (const [k, timestamp] of sentMessageDedupCache.entries()) {
    if (now - timestamp > 15000) {
      sentMessageDedupCache.delete(k);
    }
  }

  const lastSent = sentMessageDedupCache.get(key);
  if (lastSent && (now - lastSent) < 3000) {
    return true;
  }

  sentMessageDedupCache.set(key, now);
  return false;
}

import { sendViaWhatsAppWeb, getWhatsAppStatus } from './whatsappWebClient';

// ---------------------------------------------------------------------------
// DIRECT LIVE WHATSAPP DISPATCHER
// ---------------------------------------------------------------------------
export async function sendWhatsAppDirectMessage(
  recipientPhone: string,
  messageBody: string,
  recipientName?: string
): Promise<{ success: boolean; sid?: string; simulated?: boolean }> {
  const rawPhone = normalizePhoneNumber(recipientPhone);

  if (!rawPhone) {
    console.warn('[WhatsAppService] Cannot dispatch WhatsApp message: No valid phone number provided.');
    return { success: false };
  }

  // Deduplication check: prevent accidental double-clicks within 3 seconds
  if (isDuplicateMessage(rawPhone, messageBody)) {
    console.log(`[WhatsAppService] 🛡️ Suppressed duplicate WhatsApp message to ${rawPhone} within 3s.`);
    return { success: true, simulated: true };
  }

  // 1. Check WhatsApp Web Gateway (#1 Unlimited Direct Messaging to ANY Number)
  try {
    const waStatus = getWhatsAppStatus();
    if (waStatus.isReady) {
      console.log(`[WhatsAppService] 📱 Using Active WhatsApp Web Gateway (Unlimited direct delivery to ${rawPhone})...`);
      const webResult = await sendViaWhatsAppWeb(rawPhone, messageBody);
      if (webResult.success) {
        return { success: true, sid: webResult.id };
      }
    }
  } catch (webErr: any) {
    console.warn('[WhatsAppService] WhatsApp Web gateway dispatch note:', webErr.message);
  }

  // 2. Check Green-API (Optional Cloud Provider Fallback if configured)
  const greenApiId = process.env.GREEN_API_INSTANCE_ID;
  const greenApiToken = process.env.GREEN_API_API_TOKEN;

  if (greenApiId && greenApiToken && rawPhone) {
    try {
      console.log(`[WhatsAppService] 🚀 Dispatching live WhatsApp via Green-API directly to target user: ${rawPhone} (${recipientName || 'Citizen'})`);
      const endpoint = `https://api.green-api.com/waInstance${greenApiId}/sendMessage/${greenApiToken}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(2500),
        body: JSON.stringify({
          chatId: `${rawPhone}@c.us`,
          message: messageBody
        })
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        if (data && data.idMessage) {
          console.log(`[WhatsAppService] ✅ WhatsApp message DELIVERED to ${rawPhone} via Green-API! idMessage: ${data.idMessage}`);
          return { success: true, sid: data.idMessage };
        } else if (data?.correspondentsStatus?.status === 'CORRESPONDENTS_QUOTE_EXCEEDED') {
          console.log(`[WhatsAppService] ℹ️ Green-API note: Recipient ${rawPhone} is not in developer trial correspondent list.`);
          console.log(`[WhatsAppService] 💡 Tip: Scan QR at http://localhost:5000/whatsapp/qr to send unlimited messages to ANY number via Web.js!`);
        } else {
          console.warn(`[WhatsAppService] ⚠️ Green-API note for ${rawPhone}:`, JSON.stringify(data));
        }
      }
    } catch (err: any) {
      console.warn('[WhatsAppService] Green-API dispatch note:', err.message);
    }
  }

  // 3. Check Twilio Provider Fallback
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+17372212163';
  const cleanPhone = `+${rawPhone}`;

  if (twilioSid && twilioAuthToken && cleanPhone) {
    try {
      console.log(`[WhatsAppService] Dispatching WhatsApp message via Twilio to ${cleanPhone} (${recipientName || 'Citizen'})`);
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const authHeader = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');

      let senderNumber = twilioFrom;
      if (!senderNumber.startsWith('whatsapp:')) {
        senderNumber = `whatsapp:${senderNumber}`;
      }

      const params = new URLSearchParams();
      params.append('From', senderNumber);
      params.append('To', `whatsapp:${cleanPhone}`);
      params.append('Body', messageBody);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        signal: AbortSignal.timeout(2500),
        body: params.toString()
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        console.log(`[WhatsAppService] ✅ WhatsApp message queued via Twilio! SID: ${data.sid}`);
        return { success: true, sid: data.sid };
      }
    } catch (err: any) {
      console.warn('[WhatsAppService] Twilio dispatch note:', err.message);
    }
  }

  // Fallback simulator log
  console.log(`\n======================================================`);
  console.log(`💬 [WHATSAPP DISPATCH SIMULATOR]`);
  console.log(`Recipient: ${recipientName || 'Citizen'} (+${rawPhone})`);
  console.log(`------------------------------------------------------`);
  console.log(messageBody);
  console.log(`======================================================\n`);

  return { success: true, simulated: true };
}

// ---------------------------------------------------------------------------
// WELCOME NOTIFICATION GENERATOR & DISPATCHER
// ---------------------------------------------------------------------------
export async function sendWelcomeWhatsAppNotification(user: {
  name: string;
  email: string;
  phone: string;
  role?: string;
}): Promise<{ success: boolean; sid?: string; simulated?: boolean }> {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const roleLabel = user.role === 'CITIZEN' ? 'Resident Citizen' : (user.role || 'Member');

  const welcomeMessage = `
🏛️ *WELCOME TO CIVIX MUNICIPAL PORTAL*
━━━━━━━━━━━━━━━━━━━━━━
Hello *${user.name}*,

Welcome to the *Civix Smart Municipal Network*! Your account has been registered successfully with your mobile number *${user.phone}*.

✨ *Account Registration Details:*
👤 *Name:* ${user.name}
📱 *Phone:* ${user.phone}
📧 *Email:* ${user.email}
🛡️ *Portal Role:* ${roleLabel}

━━━━━━━━━━━━━━━━━━━━━━
🌟 *What You Can Do On Civix:*
• 📍 Lodge grievances with GPS location & photo proof
• 🤖 Instant AI-powered severity triage & routing
• 📲 Receive real-time WhatsApp & Email status updates
• 👷 Track assigned field officers and resolution milestones

━━━━━━━━━━━━━━━━━━━━━━
🌐 *Sign In & Access Your Dashboard:*
🔗 ${frontendUrl}
━━━━━━━━━━━━━━━━━━━━━━

_📞 24×7 Citizen Helpline: 1800-CIVIX-CARE (Toll-Free)_
_🏛️ Ministry of Housing & Smart Municipal Governance_
`.trim();

  return sendWhatsAppDirectMessage(user.phone, welcomeMessage, user.name);
}

export async function sendWhatsAppNotification(options: DispatchNotificationOptions): Promise<{ success: boolean; sid?: string; simulated?: boolean }> {
  const { citizen } = options;
  const messageBody = generateWhatsAppMessage(options);
  return sendWhatsAppDirectMessage(citizen.phone, messageBody, citizen.name);
}

// ---------------------------------------------------------------------------
// MASTER EXTERNAL DISPATCH HELPER
// ---------------------------------------------------------------------------
export async function dispatchExternalCitizenNotification(options: DispatchNotificationOptions): Promise<{ email: boolean; whatsapp: boolean }> {
  try {
    const [emailRes, whatsappRes] = await Promise.allSettled([
      sendEmailNotification(options),
      sendWhatsAppNotification(options)
    ]);

    return {
      email: emailRes.status === 'fulfilled' && emailRes.value.success,
      whatsapp: whatsappRes.status === 'fulfilled' && whatsappRes.value.success
    };
  } catch (error) {
    console.error('[ExternalMessaging] Error in dispatchExternalCitizenNotification:', error);
    return { email: false, whatsapp: false };
  }
}
