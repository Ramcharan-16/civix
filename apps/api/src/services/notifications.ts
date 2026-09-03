import { prisma } from '../prisma';
import { dispatchExternalCitizenNotification, DispatchNotificationOptions } from './externalMessaging';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type?: string;
  complaintId?: string;
  eventType?: 'REGISTERED' | 'STATUS_UPDATE' | 'PROGRESS_UPDATE' | 'ASSIGNED' | 'RESOLVED' | 'REOPENED';
  remarks?: string;
  sendExternal?: boolean;
}

export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  const { userId, title, message, complaintId, eventType, remarks, type, sendExternal } = payload;

  try {
    // 1. Create in-app database notification for the target user (citizen or staff)
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        isRead: false
      }
    });

    // 2. Only dispatch external Email & WhatsApp to the citizen if this is an explicit citizen event
    // Internal alerts, staff notifications, and SLA breaches must NOT send WhatsApp updates to citizens
    const isInternalAlert = type === 'SLA_BREACH' || type === 'INTERNAL' || type === 'SYSTEM';
    const shouldDispatchExternal = (eventType !== undefined || sendExternal === true) && !isInternalAlert;

    if (complaintId && shouldDispatchExternal) {
      // Dispatch in background asynchronously to prevent blocking HTTP API responses
      setImmediate(async () => {
        try {
          const complaint = await prisma.complaint.findUnique({
            where: { id: complaintId },
            include: {
              citizen: true,
              category: true,
              assignedDepartment: true,
              assignedStaff: true
            }
          });

          if (complaint && complaint.citizen && complaint.citizen.phone) {
            const dispatchOpts: DispatchNotificationOptions = {
              citizen: {
                name: complaint.citizen.name,
                email: complaint.citizen.email,
                phone: complaint.citizen.phone
              },
              eventType: eventType || (complaint.status === 'RESOLVED' ? 'RESOLVED' : 'STATUS_UPDATE'),
              complaint: {
                complaintNumber: complaint.complaintNumber,
                title: complaint.title,
                description: complaint.description,
                status: complaint.status,
                category: complaint.category?.name,
                severity: complaint.severity,
                departmentName: complaint.assignedDepartment?.name,
                staffName: complaint.assignedStaff?.name,
                updateRemarks: remarks || message
              }
            };

            await dispatchExternalCitizenNotification(dispatchOpts);
          }
        } catch (externalErr) {
          console.warn('[NotificationService] Background external dispatch note:', externalErr);
        }
      });
    }

    return true;
  } catch (error) {
    console.error('[NotificationService] Error recording notification:', error);
    return false;
  }
}

/**
 * Direct helper to notify citizen about progress updates via In-App, Email & WhatsApp
 */
export async function notifyCitizenProgressUpdate(params: {
  complaintId: string;
  progressPercentage: number;
  description: string;
  staffName?: string;
}) {
  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: params.complaintId },
      include: { citizen: true, category: true, assignedDepartment: true, assignedStaff: true }
    });

    if (!complaint || !complaint.citizen) return;

    // In-app notification
    await prisma.notification.create({
      data: {
        userId: complaint.citizenId,
        title: `Work Progress Updated (${params.progressPercentage}%)`,
        message: `Officer ${params.staffName || 'assigned'} updated complaint #${complaint.complaintNumber} to ${params.progressPercentage}%: "${params.description}"`,
        isRead: false
      }
    });

    // External WhatsApp & Email notification in background
    setImmediate(async () => {
      try {
        const dispatchOpts: DispatchNotificationOptions = {
          citizen: {
            name: complaint.citizen.name,
            email: complaint.citizen.email,
            phone: complaint.citizen.phone
          },
          eventType: 'PROGRESS_UPDATE',
          complaint: {
            complaintNumber: complaint.complaintNumber,
            title: complaint.title,
            status: complaint.status,
            category: complaint.category?.name,
            departmentName: complaint.assignedDepartment?.name,
            staffName: params.staffName || complaint.assignedStaff?.name,
            progressPercentage: params.progressPercentage,
            updateRemarks: params.description
          }
        };

        await dispatchExternalCitizenNotification(dispatchOpts);
      } catch (err) {
        console.warn('[NotificationService] notifyCitizenProgressUpdate background dispatch note:', err);
      }
    });
  } catch (err) {
    console.error('[NotificationService] notifyCitizenProgressUpdate error:', err);
  }
}
