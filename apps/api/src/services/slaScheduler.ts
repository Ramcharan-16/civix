import { prisma } from '../prisma';
import { sendNotification } from './notifications';

let schedulerInterval: NodeJS.Timeout | null = null;
const notifiedBreaches = new Set<string>();

const DEFAULT_SLA_HOURS: Record<string, number> = {
  CRITICAL: 12,
  HIGH: 24,
  MEDIUM: 48,
  LOW: 72
};

export async function runSlaCheck() {
  try {
    // 1. Fetch SLA settings if configured in DB
    const dbSettings = await prisma.slaSetting.findMany();
    const slaMap: Record<string, number> = { ...DEFAULT_SLA_HOURS };
    for (const s of dbSettings) {
      if (s.key.includes('CRITICAL')) slaMap.CRITICAL = s.durationHours;
      if (s.key.includes('HIGH')) slaMap.HIGH = s.durationHours;
      if (s.key.includes('MEDIUM')) slaMap.MEDIUM = s.durationHours;
      if (s.key.includes('LOW')) slaMap.LOW = s.durationHours;
    }

    // 2. Query open active complaints
    const openComplaints = await prisma.complaint.findMany({
      where: {
        status: {
          in: ['SUBMITTED', 'PENDING_VERIFICATION', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD']
        }
      },
      include: {
        assignedStaff: { select: { id: true, name: true } },
        assignedDepartment: { select: { id: true, name: true } }
      },
      take: 100
    });

    const now = Date.now();

    for (const complaint of openComplaints) {
      const allowedHours = slaMap[complaint.severity] || slaMap[complaint.priority] || 48;
      const createdMs = new Date(complaint.createdAt).getTime();
      const elapsedHours = (now - createdMs) / (1000 * 60 * 60);

      // SLA Overdue Breach Condition
      if (elapsedHours > allowedHours) {
        const breachKey = `breach_${complaint.id}`;
        if (!notifiedBreaches.has(breachKey)) {
          notifiedBreaches.add(breachKey);

          // Notify assigned staff if present
          if (complaint.assignedStaffId) {
            await sendNotification({
              userId: complaint.assignedStaffId,
              title: `⚠️ SLA Overdue: ${complaint.complaintNumber}`,
              message: `Complaint "${complaint.title}" has exceeded the allocated SLA time of ${allowedHours}h. Immediate action required.`,
              priority: 'CRITICAL',
              type: 'SLA_BREACH',
              complaintId: complaint.id
            });
          }

          // Record audit log for SLA breach
          await prisma.auditLog.create({
            data: {
              action: 'SLA_BREACH_DETECTED',
              entity: 'Complaint',
              entityId: complaint.id
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('[SLAScheduler] Error checking SLA compliance:', error);
  }
}

export function startSlaScheduler() {
  if (schedulerInterval) return;
  // Run an initial check after 5s startup delay
  setTimeout(() => runSlaCheck(), 5000);
  // Recurring check every 60 seconds
  schedulerInterval = setInterval(() => {
    runSlaCheck();
  }, 60000);
}

export function stopSlaScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

