import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { Role } from '@civix/database';

const router: Router = Router();

// POST /comments - Add a comment to a complaint
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { complaintId, content } = req.body;

  if (!complaintId || !content || content.trim() === '') {
    res.status(400).json({ error: 'Complaint ID and comment content are required' });
    return;
  }

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId }
    });

    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found' });
      return;
    }

    const { id, role, name } = req.user!;

    const comment = await prisma.comment.create({
      data: {
        complaintId,
        userName: name,
        userRole: role,
        content
      }
    });

    if (id !== complaint.citizenId) {
      await prisma.notification.create({
        data: {
          userId: complaint.citizenId,
          title: 'New Comment on your Complaint',
          message: `${name} commented: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`
        }
      });
    }

    res.status(201).json({
      ...comment,
      user: {
        id,
        name,
        role
      }
    });
  } catch (error) {
    console.error('Failed to create comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

export default router;
