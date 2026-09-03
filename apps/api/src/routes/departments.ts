import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { Role } from '@civix/database';

const router: Router = Router();

// GET /departments - List departments & categories
router.get('/', async (req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        categories: true
      },
      orderBy: { name: 'asc' }
    });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// GET /departments/staff - List staff members
router.get('/staff', authenticate, authorize([Role.SUPER_ADMIN, Role.DEPARTMENT_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const staff = await prisma.staffMember.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        employeeId: true,
        designation: true,
        departmentId: true
      }
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff members' });
  }
});

// POST /departments - Create a department
router.post('/', authenticate, authorize([Role.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, description, contactEmail, contactPhone } = req.body;

  if (!name || !description || !contactEmail || !contactPhone) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  try {
    const department = await prisma.department.create({
      data: { name, description, contactEmail, contactPhone }
    });
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// POST /departments/:id/categories - Create a category in a department
router.post('/:id/categories', authenticate, authorize([Role.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, description } = req.body;
  const departmentId = req.params.id;

  if (!name || !description) {
    res.status(400).json({ error: 'Name and description are required' });
    return;
  }

  try {
    const category = await prisma.category.create({
      data: {
        name,
        description,
        departmentId
      }
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

export default router;
