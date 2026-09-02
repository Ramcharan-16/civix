import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { ComplaintStatus } from '@civix/database';

const router: Router = Router();

// GET /stats - General dashboard aggregation metrics
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const statusCounts = await prisma.complaint.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    const statusMap = statusCounts.reduce((acc: Record<string, number>, curr: any) => {
      acc[curr.status] = curr._count._all;
      return acc;
    }, {} as Record<string, number>);

    const severityCounts = await prisma.complaint.groupBy({
      by: ['severity'],
      _count: { _all: true }
    });

    const severityMap = severityCounts.reduce((acc: Record<string, number>, curr: any) => {
      acc[curr.severity] = curr._count._all;
      return acc;
    }, {} as Record<string, number>);

    const totalAssigned = await prisma.complaint.count({
      where: { assignedStaffId: { not: null } }
    });

    const resolvedComplaintsCount = await prisma.complaint.count({
      where: { status: { in: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] } }
    });

    const inProgressCount = await prisma.complaint.count({
      where: { status: ComplaintStatus.IN_PROGRESS }
    });

    const departmentsBreakdown = await prisma.department.findMany({
      include: {
        complaints: {
          include: {
            feedbacks: true
          }
        }
      }
    });

    const departmentStats = departmentsBreakdown.map((dept: any) => {
      const total = dept.complaints.length;
      const resolved = dept.complaints.filter((c: any) => c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED).length;
      const pending = total - resolved;
      const ratings = dept.complaints.flatMap((c: any) => c.feedbacks.map((f: any) => f.rating));
      const avgRating = ratings.length > 0 ? Number((ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length).toFixed(1)) : 5.0;

      return {
        id: dept.id,
        name: dept.name,
        total,
        resolved,
        pending,
        overdue: 0,
        complianceRate: 100,
        avgResolutionHours: 24,
        citizenRating: avgRating
      };
    });

    const staffList = await prisma.staffMember.findMany({
      include: {
        assignedComplaints: {
          include: {
            feedbacks: true
          }
        }
      }
    });

    const staffStats = staffList.map((staff: any) => {
      const assigned = staff.assignedComplaints.length;
      const completed = staff.assignedComplaints.filter((c: any) => c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED).length;
      const pending = assigned - completed;
      const ratings = staff.assignedComplaints.flatMap((c: any) => c.feedbacks.map((f: any) => f.rating));
      const avgRating = ratings.length > 0 ? Number((ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length).toFixed(1)) : 5.0;

      return {
        id: staff.id,
        name: staff.name,
        employeeId: staff.employeeId,
        designation: staff.designation,
        assigned,
        completed,
        pending,
        overdue: 0,
        complianceRate: 100,
        avgResolutionHours: 24,
        citizenRating: avgRating
      };
    });

    const [totalComplaints, citizenCount, staffCount, deptAdminCount, superAdminCount] = await Promise.all([
      prisma.complaint.count(),
      prisma.citizen.count(),
      prisma.staffMember.count(),
      prisma.departmentAdmin.count(),
      prisma.superAdmin.count()
    ]);

    const totalUsers = citizenCount + staffCount + deptAdminCount + superAdminCount;

    res.json({
      totals: {
        complaints: totalComplaints,
        users: totalUsers,
        citizens: citizenCount,
        staff: staffCount,
        deptAdmins: deptAdminCount,
        superAdmins: superAdminCount,
        resolved: resolvedComplaintsCount,
        resolutionRate: totalComplaints > 0 ? Number(((resolvedComplaintsCount / totalComplaints) * 100).toFixed(1)) : 0,
        totalAssigned,
        inProgress: inProgressCount,
        resolvedOnTime: resolvedComplaintsCount,
        resolvedLate: 0,
        currentlyOverdue: 0,
        avgResolutionHours: 24,
        slaComplianceRate: 100
      },
      statusDistribution: statusMap,
      severityDistribution: severityMap,
      departmentStats,
      staffStats
    });
  } catch (error) {
    console.error('Stats aggregation error:', error);
    res.status(500).json({ error: 'Failed to aggregate metrics' });
  }
});

export default router;
