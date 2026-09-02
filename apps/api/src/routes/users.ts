import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { Role } from '@civix/database';

const router: Router = Router();

// GET /users/me - Get current profile
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const { id, role } = req.user;
    let profile: any = null;

    if (role === Role.CITIZEN) {
      profile = await prisma.citizen.findUnique({ where: { id } });
    } else if (role === Role.STAFF) {
      profile = await prisma.staffMember.findUnique({
        where: { id },
        include: { department: true }
      });
    } else if (role === Role.DEPARTMENT_ADMIN) {
      profile = await prisma.departmentAdmin.findUnique({
        where: { id },
        include: { department: true }
      });
    } else if (role === Role.SUPER_ADMIN) {
      profile = await prisma.superAdmin.findUnique({ where: { id } });
    }

    if (!profile) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      role,
      address: profile.address,
      employeeId: profile.employeeId,
      designation: profile.designation,
      roleTitle: profile.roleTitle,
      departmentId: profile.departmentId,
      department: profile.department,
      createdAt: profile.createdAt
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// PUT /users/me/preferences - No-op for lean schema
router.put('/me/preferences', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ success: true, preferences: {} });
});

// GET /users - List all users grouped by role (Super Admin only)
router.get('/', authenticate, authorize([Role.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [citizens, staff, deptAdmins, superAdmins] = await Promise.all([
      prisma.citizen.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.staffMember.findMany({ include: { department: true }, orderBy: { createdAt: 'desc' } }),
      prisma.departmentAdmin.findMany({ include: { department: true }, orderBy: { createdAt: 'desc' } }),
      prisma.superAdmin.findMany({ orderBy: { createdAt: 'desc' } })
    ]);

    const formattedList = [
      ...superAdmins.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: Role.SUPER_ADMIN,
        roleTitle: u.roleTitle,
        createdAt: u.createdAt
      })),
      ...deptAdmins.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: Role.DEPARTMENT_ADMIN,
        employeeId: u.employeeId,
        designation: u.designation,
        department: u.department?.name,
        createdAt: u.createdAt
      })),
      ...staff.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: Role.STAFF,
        employeeId: u.employeeId,
        designation: u.designation,
        department: u.department?.name,
        createdAt: u.createdAt
      })),
      ...citizens.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: Role.CITIZEN,
        address: u.address,
        createdAt: u.createdAt
      }))
    ];

    res.json(formattedList);
  } catch (error) {
    console.error('Failed to retrieve users list:', error);
    res.status(500).json({ error: 'Failed to retrieve users list' });
  }
});

export default router;
