import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { Role } from '@civix/database';

const router: Router = Router();

// GET /admin/sla-settings - Fetch all SLA settings
router.get('/sla-settings', authenticate, authorize([Role.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await prisma.slaSetting.findMany({
      orderBy: { key: 'asc' }
    });
    // Format to include both durationHours and durationMinutes for frontend compatibility
    const formatted = settings.map((s) => ({
      ...s,
      durationMinutes: s.durationHours * 60,
      type: s.key.startsWith('SEVERITY_') ? 'SEVERITY' : s.key.startsWith('PRIORITY_') ? 'PRIORITY' : 'GENERAL'
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve SLA settings' });
  }
});

// PUT /admin/sla-settings - Update or create SLA setting
router.put('/sla-settings', authenticate, authorize([Role.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  let { key, type, durationHours, durationMinutes } = req.body;

  if (!key && type) {
    key = `${type}_DEFAULT`;
  }

  if (!key) {
    res.status(400).json({ error: 'Setting key is required.' });
    return;
  }

  let calculatedHours = 24;
  if (durationHours !== undefined && durationHours !== null) {
    calculatedHours = Math.max(1, parseInt(durationHours, 10));
  } else if (durationMinutes !== undefined && durationMinutes !== null) {
    calculatedHours = Math.max(1, Math.round(parseInt(durationMinutes, 10) / 60));
  }

  try {
    const setting = await prisma.slaSetting.upsert({
      where: { key },
      update: { durationHours: calculatedHours },
      create: { key, durationHours: calculatedHours }
    });

    res.json({
      ...setting,
      durationMinutes: setting.durationHours * 60,
      type: type || 'GENERAL'
    });
  } catch (error) {
    console.error('Failed to update SLA setting:', error);
    res.status(500).json({ error: 'Failed to update SLA setting' });
  }
});

export default router;
