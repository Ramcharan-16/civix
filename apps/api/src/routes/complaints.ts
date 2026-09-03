import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { Role, ComplaintStatus, Severity, Priority, Prisma } from '@civix/database';
import { analyzeComplaint } from '../services/ai';
import { sendNotification } from '../services/notifications';

const router: Router = Router();

async function generateComplaintNumber(): Promise<string> {
  const count = await prisma.complaint.count();
  const nextNum = count + 1;
  const year = new Date().getFullYear();
  return `CIVIX-${year}-${String(nextNum).padStart(6, '0')}`;
}

// GET /complaints - List and search complaints with pagination
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      status,
      categoryId,
      severity,
      priority,
      citizenId,
      assignedStaffId,
      assignedDepartmentId,
      search,
      page = '1',
      limit = '10'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: Prisma.ComplaintWhereInput = {};

    if (status) where.status = status as ComplaintStatus;
    if (categoryId) where.categoryId = categoryId as string;
    if (severity) where.severity = severity as Severity;
    if (priority) where.priority = priority as Priority;
    if (citizenId) where.citizenId = citizenId as string;
    if (assignedStaffId) where.assignedStaffId = assignedStaffId as string;
    if (assignedDepartmentId) where.assignedDepartmentId = assignedDepartmentId as string;

    const andFilters: Prisma.ComplaintWhereInput[] = [];

    if (search) {
      andFilters.push({
        OR: [
          { title: { contains: search as string } },
          { description: { contains: search as string } },
          { address: { contains: search as string } },
          { complaintNumber: { contains: search as string } }
        ]
      });
    }

    if (req.user?.role === Role.CITIZEN) {
      andFilters.push({
        OR: [
          { citizenId: req.user.id },
          {
            status: {
              in: [
                ComplaintStatus.SUBMITTED,
                ComplaintStatus.PENDING_VERIFICATION,
                ComplaintStatus.VERIFIED,
                ComplaintStatus.ASSIGNED,
                ComplaintStatus.IN_PROGRESS,
                ComplaintStatus.ON_HOLD,
                ComplaintStatus.RESOLVED,
                ComplaintStatus.CLOSED
              ]
            }
          }
        ]
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const total = await prisma.complaint.count({ where });
    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        category: true,
        citizen: {
          select: { id: true, name: true, email: true, phone: true }
        },
        assignedDepartment: true,
        assignedStaff: {
          select: { id: true, name: true, email: true, phone: true, employeeId: true, designation: true }
        },
        upvotes: {
          select: { citizenId: true }
        },
        _count: {
          select: { upvotes: true, comments: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    const mapped = complaints.map((c: any) => ({
      ...c,
      upvotes: c.upvotes.map((u: any) => ({ userId: u.citizenId }))
    }));

    res.json({
      complaints: mapped,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('List complaints error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints' });
  }
});

// GET /complaints/:id - Detail view
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const complaintId = req.params.id;

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        category: true,
        citizen: {
          select: { id: true, name: true, email: true, phone: true }
        },
        assignedDepartment: true,
        assignedStaff: {
          select: { id: true, name: true, email: true, phone: true, employeeId: true, designation: true }
        },
        media: true,
        statusLogs: {
          orderBy: { createdAt: 'asc' }
        },
        comments: {
          orderBy: { createdAt: 'asc' }
        },
        feedbacks: {
          include: {
            citizen: {
              select: { id: true, name: true }
            }
          }
        },
        upvotes: {
          select: { citizenId: true }
        },
        assignments: {
          include: {
            department: { select: { name: true } },
            staff: { select: { name: true, email: true, employeeId: true } }
          },
          orderBy: { assignedAt: 'desc' }
        },
        progressUpdates: {
          include: {
            staff: { select: { name: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found' });
      return;
    }

    const transformedComplaint = {
      ...complaint,
      upvotes: complaint.upvotes.map((u: any) => ({ userId: u.citizenId })),
      statusLogs: complaint.statusLogs.map((l: any) => ({
        ...l,
        user: {
          name: l.changedByName || 'Staff',
          role: 'STAFF'
        }
      })),
      comments: complaint.comments.map((c: any) => ({
        ...c,
        user: {
          name: c.userName || 'User',
          role: c.userRole
        }
      })),
      assignments: complaint.assignments.map((a: any) => ({
        ...a,
        assigner: {
          name: a.assignedBy || 'Administrator'
        }
      }))
    };

    res.json(transformedComplaint);
  } catch (error) {
    console.error('Get complaint detail error:', error);
    res.status(500).json({ error: 'Failed to fetch complaint details' });
  }
});

// POST /complaints - Log a new complaint (Citizen)
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { title, description, categoryId, address, latitude, longitude, mediaUrl } = req.body;

  if (!title || !description || !categoryId || !address) {
    res.status(400).json({ error: 'Required fields missing: title, description, categoryId, address' });
    return;
  }

  try {
    const [complaintNumber, aiResult] = await Promise.all([
      generateComplaintNumber(),
      analyzeComplaint(title, description)
    ]);

    let resolvedCategoryId = categoryId;
    if (aiResult.category) {
      const matchedCategory = await prisma.category.findFirst({
        where: { name: aiResult.category }
      });
      if (matchedCategory) {
        resolvedCategoryId = matchedCategory.id;
      }
    }

    const complaint = await prisma.complaint.create({
      data: {
        complaintNumber,
        title,
        description,
        categoryId: resolvedCategoryId,
        citizenId: req.user!.id,
        address,
        latitude: latitude ? parseFloat(latitude) : 12.971598,
        longitude: longitude ? parseFloat(longitude) : 77.594562,
        severity: (aiResult.severity as Severity) || Severity.MEDIUM,
        status: ComplaintStatus.PENDING_VERIFICATION
      },
      include: {
        category: true
      }
    });

    await prisma.statusLog.create({
      data: {
        complaintId: complaint.id,
        oldStatus: 'SUBMITTED',
        newStatus: 'PENDING_VERIFICATION',
        changedByName: 'AI Triage Engine',
        comment: `AI triage finished. Category: "${aiResult.category}". Severity: ${aiResult.severity}. Reasoning: ${aiResult.reasoning}`
      }
    });

    if (mediaUrl) {
      await prisma.complaintMedia.create({
        data: {
          complaintId: complaint.id,
          fileUrl: mediaUrl,
          mimeType: 'image/jpeg'
        }
      });
    }

    // Notify citizen via In-App, Email and WhatsApp (non-blocking background queue)
    sendNotification({
      userId: req.user!.id,
      title: 'Complaint Registered',
      message: `Your complaint #${complaintNumber} ("${title}") is registered and under review.`,
      complaintId: complaint.id,
      eventType: 'REGISTERED'
    }).catch(err => console.warn('[ComplaintRoute] Background notification warning:', err));

    res.status(201).json(complaint);
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

// PUT /complaints/:id/status - Update complaint status
router.put('/:id/status', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const complaintId = req.params.id;
  const { status, assignedDepartmentId, assignedStaffId, comment, priority, severity, mediaUrl } = req.body;

  if (!status) {
    res.status(400).json({ error: 'New status is required' });
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

    const oldStatus = complaint.status;
    const userRole = req.user!.role;
    const userId = req.user!.id;
    const userName = req.user!.name;

    if (userRole === Role.CITIZEN) {
      if (status !== ComplaintStatus.CLOSED) {
        res.status(403).json({ error: 'Citizens are only allowed to CLOSE complaints.' });
        return;
      }
      if (oldStatus !== ComplaintStatus.RESOLVED) {
        res.status(400).json({ error: 'Complaint must be RESOLVED before it can be CLOSED.' });
        return;
      }
    }

    if (userRole === Role.STAFF) {
      const allowed: ComplaintStatus[] = [ComplaintStatus.IN_PROGRESS, ComplaintStatus.ON_HOLD, ComplaintStatus.RESOLVED];
      if (!allowed.includes(status as ComplaintStatus)) {
        res.status(403).json({ error: 'Staff can only set status to: IN_PROGRESS, ON_HOLD, or RESOLVED.' });
        return;
      }
      if (complaint.assignedStaffId !== userId) {
        res.status(403).json({ error: 'You are not assigned to this complaint.' });
        return;
      }
    }

    const updateData: Prisma.ComplaintUpdateInput = {
      status: status as ComplaintStatus
    };

    if (assignedDepartmentId) {
      updateData.assignedDepartment = { connect: { id: assignedDepartmentId } };
    }
    if (assignedStaffId) {
      updateData.assignedStaff = { connect: { id: assignedStaffId } };
    }
    if (priority) {
      updateData.priority = priority as Priority;
    }
    if (severity) {
      updateData.severity = severity as Severity;
    }

    if (status === ComplaintStatus.RESOLVED || status === ComplaintStatus.CLOSED) {
      updateData.resolvedAt = new Date();
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: updateData
    });

    if (mediaUrl) {
      await prisma.complaintMedia.create({
        data: {
          complaintId,
          fileUrl: mediaUrl,
          mimeType: 'image/jpeg'
        }
      });
    }

    await prisma.statusLog.create({
      data: {
        complaintId,
        oldStatus,
        newStatus: status,
        changedByName: userName,
        comment: comment || `Status updated to ${status}.`
      }
    });

    // Notify citizen on status change via In-App, Email and WhatsApp
    await sendNotification({
      userId: complaint.citizenId,
      title: `Status Update: ${status}`,
      message: `Your complaint #${complaint.complaintNumber} is now marked as ${status}. ${comment ? 'Notes: ' + comment : ''}`,
      complaintId: complaint.id,
      eventType: status === ComplaintStatus.RESOLVED ? 'RESOLVED' : 'STATUS_UPDATE',
      remarks: comment || `Status updated to ${status}`
    });

    res.json(updated);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update complaint status' });
  }
});

// POST /complaints/:id/upvote - Toggle upvote
router.post('/:id/upvote', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const complaintId = req.params.id;
  const citizenId = req.user!.id;

  try {
    const existing = await prisma.upvote.findUnique({
      where: {
        complaintId_citizenId: { complaintId, citizenId }
      }
    });

    if (existing) {
      await prisma.upvote.delete({
        where: {
          complaintId_citizenId: { complaintId, citizenId }
        }
      });
      res.json({ upvoted: false });
    } else {
      await prisma.upvote.create({
        data: { complaintId, citizenId }
      });
      res.json({ upvoted: true });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle upvote' });
  }
});

// POST /complaints/:id/feedback - Add feedback & close complaint
router.post('/:id/feedback', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const complaintId = req.params.id;
  const { rating, comment } = req.body;
  const citizenId = req.user!.id;

  if (rating === undefined || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    return;
  }

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId }
    });

    if (!complaint || complaint.citizenId !== citizenId) {
      res.status(404).json({ error: 'Complaint not found or unauthorized' });
      return;
    }

    if (complaint.status !== ComplaintStatus.RESOLVED) {
      res.status(400).json({ error: 'Feedback can only be provided for RESOLVED complaints' });
      return;
    }

    const feedback = await prisma.feedback.create({
      data: {
        complaintId,
        citizenId,
        rating: parseInt(rating, 10),
        comment
      }
    });

    await prisma.complaint.update({
      where: { id: complaintId },
      data: { status: ComplaintStatus.CLOSED }
    });

    await prisma.statusLog.create({
      data: {
        complaintId,
        oldStatus: ComplaintStatus.RESOLVED,
        newStatus: ComplaintStatus.CLOSED,
        changedByName: req.user!.name,
        comment: `Citizen provided feedback (Rating: ${rating}/5). Complaint closed.`
      }
    });

    if (complaint.assignedStaffId) {
      await sendNotification({
        userId: complaint.assignedStaffId,
        title: 'Feedback Received ⭐',
        message: `Citizen rated your resolution of #${complaint.complaintNumber} with ${rating}/5 stars.`
      });
    }

    res.status(201).json(feedback);
  } catch (error) {
    console.error('Feedback creation error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// POST /complaints/:id/assign - Assign department & staff
router.post('/:id/assign', authenticate, authorize([Role.SUPER_ADMIN, Role.DEPARTMENT_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const complaintId = req.params.id;
  const { departmentId, staffId, priority, reason } = req.body;

  if (!departmentId || !staffId) {
    res.status(400).json({ error: 'Department and staff are required.' });
    return;
  }

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: { citizen: true }
    });

    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found.' });
      return;
    }

    const staffMember = await prisma.staffMember.findUnique({
      where: { id: staffId }
    });

    const updatedComplaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        assignedDepartmentId: departmentId,
        assignedStaffId: staffId,
        priority: priority ? (priority as Priority) : complaint.priority,
        status: ComplaintStatus.ASSIGNED
      }
    });

    await prisma.complaintAssignment.create({
      data: {
        complaintId,
        departmentId,
        staffId,
        assignedBy: req.user!.name,
        reason: reason || 'Delegated to field staff'
      }
    });

    await prisma.statusLog.create({
      data: {
        complaintId,
        oldStatus: complaint.status,
        newStatus: ComplaintStatus.ASSIGNED,
        changedByName: req.user!.name,
        comment: reason || `Complaint assigned to officer ${staffMember?.name || ''}.`
      }
    });

    // Notify Citizen via In-App, Email & WhatsApp
    await sendNotification({
      userId: complaint.citizenId,
      title: 'Officer Assigned 👷',
      message: `Officer ${staffMember?.name || 'Staff'} has been assigned to your complaint #${complaint.complaintNumber}.`,
      complaintId: complaint.id,
      eventType: 'ASSIGNED',
      remarks: reason || `Assigned to ${staffMember?.name || 'field officer'}`
    });

    // Notify Staff Member
    await sendNotification({
      userId: staffId,
      title: 'New Complaint Task Assigned',
      message: `You have been assigned to investigate complaint #${complaint.complaintNumber} ("${complaint.title}").`,
      complaintId: complaint.id,
      priority: 'HIGH'
    });

    res.json(updatedComplaint);
  } catch (error) {
    console.error('Assign complaint error:', error);
    res.status(500).json({ error: 'Failed to assign complaint.' });
  }
});

// POST /complaints/:id/accept - Staff accepts task & gives estimated timeframe
router.post('/:id/accept', authenticate, authorize([Role.STAFF]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const complaintId = req.params.id;
  const staffId = req.user!.id;
  const { estimatedTimeframe } = req.body;

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId }
    });

    if (!complaint || complaint.assignedStaffId !== staffId) {
      res.status(403).json({ error: 'Unauthorized or complaint not found' });
      return;
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: { status: ComplaintStatus.ACCEPTED }
    });

    const timeframeMsg = estimatedTimeframe ? `Estimated resolution timeframe: ${estimatedTimeframe}` : 'Officer accepted assignment.';

    await prisma.statusLog.create({
      data: {
        complaintId,
        oldStatus: complaint.status,
        newStatus: ComplaintStatus.ACCEPTED,
        changedByName: req.user!.name,
        comment: `Staff member accepted task. ${timeframeMsg}`
      }
    });

    // Notify Citizen with the estimated timeframe via In-App, Email and WhatsApp
    await sendNotification({
      userId: complaint.citizenId,
      title: 'Officer Scheduled Your Complaint ⏳',
      message: `Officer ${req.user!.name} accepted your complaint #${complaint.complaintNumber}. Expected resolution: ${estimatedTimeframe || 'Within 24 Hours'}.`,
      complaintId: complaint.id,
      eventType: 'STATUS_UPDATE',
      remarks: `Accepted by officer. Estimated completion: ${estimatedTimeframe || 'Within 24 Hours'}`
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept task' });
  }
});

// POST /complaints/:id/start-work - Staff starts work & gives time gap
router.post('/:id/start-work', authenticate, authorize([Role.STAFF]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const complaintId = req.params.id;
  const staffId = req.user!.id;
  const { notes, estimatedTimeframe } = req.body;

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId }
    });

    if (!complaint || complaint.assignedStaffId !== staffId) {
      res.status(403).json({ error: 'Unauthorized or complaint not found' });
      return;
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: { status: ComplaintStatus.IN_PROGRESS }
    });

    const logMsg = `Work started on-site. ${estimatedTimeframe ? 'Expected completion: ' + estimatedTimeframe + '. ' : ''}${notes || ''}`;

    await prisma.statusLog.create({
      data: {
        complaintId,
        oldStatus: complaint.status,
        newStatus: ComplaintStatus.IN_PROGRESS,
        changedByName: req.user!.name,
        comment: logMsg
      }
    });

    // Send direct notification to Citizen via In-App, Email & WhatsApp
    await sendNotification({
      userId: complaint.citizenId,
      title: 'Work Started On-Site 🛠️',
      message: `Officer ${req.user!.name} has arrived on-site for #${complaint.complaintNumber}. Expected to resolve in: ${estimatedTimeframe || 'a few hours'}. ${notes ? 'Notes: ' + notes : ''}`,
      complaintId: complaint.id,
      eventType: 'STATUS_UPDATE',
      remarks: `Work started on-site. Expected timeframe: ${estimatedTimeframe || 'Underway'}. ${notes || ''}`
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to start work' });
  }
});

// POST /complaints/:id/progress - Staff posts progress & updates citizen
router.post('/:id/progress', authenticate, authorize([Role.STAFF]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const complaintId = req.params.id;
  const staffId = req.user!.id;
  const { progressPercentage, description, estimatedTimeframe } = req.body;

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId }
    });

    if (!complaint || complaint.assignedStaffId !== staffId) {
      res.status(403).json({ error: 'Unauthorized or complaint not found' });
      return;
    }

    const progressUpdate = await prisma.complaintProgressUpdate.create({
      data: {
        complaintId,
        staffId,
        progressPercentage: parseInt(progressPercentage, 10),
        description: description || `Progress update: ${progressPercentage}% complete.`
      }
    });

    const pctNum = parseInt(progressPercentage, 10);
    let stageName = 'In Progress';
    if (pctNum <= 10) stageName = 'Site Inspection & Assessment';
    else if (pctNum <= 25) stageName = 'In Investigation & Work Plan';
    else if (pctNum <= 50) stageName = 'Halfway Resolved / Work in Progress';
    else if (pctNum <= 75) stageName = 'Finishing & Rectification Work';
    else if (pctNum <= 90) stageName = 'Final Inspection & Site Cleanup';
    else stageName = 'Completed';

    await prisma.statusLog.create({
      data: {
        complaintId,
        oldStatus: complaint.status,
        newStatus: complaint.status,
        changedByName: req.user!.name,
        comment: `Progress update [${pctNum}% - ${stageName}]: ${description || 'Work in progress'}. ${estimatedTimeframe ? 'Estimated remaining: ' + estimatedTimeframe : ''}`
      }
    });

    // Notify Citizen with clear percentage, stage, notes, and estimated timeframe via In-App, Email & WhatsApp
    await sendNotification({
      userId: complaint.citizenId,
      title: `Status: ${pctNum}% - ${stageName} 📊`,
      message: `Officer ${req.user!.name} updated #${complaint.complaintNumber} to ${pctNum}% (${stageName}). Notes: "${description || 'Work in progress'}". Expected completion: ${estimatedTimeframe || 'On Schedule'}`,
      complaintId: complaint.id,
      eventType: 'PROGRESS_UPDATE',
      progressPercentage: pctNum,
      remarks: `Progress: ${pctNum}% (${stageName}). ${description || 'Work in progress'}`
    });

    res.status(201).json(progressUpdate);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log progress update' });
  }
});

// POST /complaints/:id/hold - Put on hold
router.post('/:id/hold', authenticate, authorize([Role.STAFF, Role.DEPARTMENT_ADMIN, Role.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const complaintId = req.params.id;
  const { reason } = req.body;

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId }
    });

    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found' });
      return;
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: { status: ComplaintStatus.ON_HOLD }
    });

    await prisma.statusLog.create({
      data: {
        complaintId,
        oldStatus: complaint.status,
        newStatus: ComplaintStatus.ON_HOLD,
        changedByName: req.user!.name,
        comment: `Ticket put ON HOLD. Reason: ${reason || 'Awaiting materials'}`
      }
    });

    // Notify Citizen about the hold reason via In-App, Email & WhatsApp
    await sendNotification({
      userId: complaint.citizenId,
      title: 'Temporary Hold Notice ⏸️',
      message: `Work on complaint #${complaint.complaintNumber} has been temporarily paused. Reason: "${reason || 'Awaiting materials'}".`,
      complaintId: complaint.id,
      eventType: 'STATUS_UPDATE',
      remarks: `Paused. Reason: ${reason || 'Awaiting materials'}`
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to put ticket on hold' });
  }
});

// POST /complaints/:id/resume - Resume from hold
router.post('/:id/resume', authenticate, authorize([Role.STAFF, Role.DEPARTMENT_ADMIN, Role.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const complaintId = req.params.id;

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId }
    });

    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found' });
      return;
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: { status: ComplaintStatus.IN_PROGRESS }
    });

    await prisma.statusLog.create({
      data: {
        complaintId,
        oldStatus: ComplaintStatus.ON_HOLD,
        newStatus: ComplaintStatus.IN_PROGRESS,
        changedByName: req.user!.name,
        comment: 'Ticket resumed back to IN_PROGRESS.'
      }
    });

    // Notify Citizen
    await sendNotification({
      userId: complaint.citizenId,
      title: 'Work Resumed ▶️',
      message: `Work has resumed on your complaint #${complaint.complaintNumber}.`
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resume ticket' });
  }
});

// POST /complaints/:id/resolve - Mark resolved
router.post('/:id/resolve', authenticate, authorize([Role.STAFF, Role.DEPARTMENT_ADMIN, Role.SUPER_ADMIN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const complaintId = req.params.id;
  const { resolutionNotes, mediaUrl } = req.body;

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId }
    });

    if (!complaint) {
      res.status(404).json({ error: 'Complaint not found' });
      return;
    }

    const resolvedAt = new Date();

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: ComplaintStatus.RESOLVED,
        resolvedAt
      }
    });

    if (mediaUrl) {
      await prisma.complaintMedia.create({
        data: {
          complaintId,
          fileUrl: mediaUrl,
          mimeType: 'image/jpeg'
        }
      });
    }

    await prisma.statusLog.create({
      data: {
        complaintId,
        oldStatus: complaint.status,
        newStatus: ComplaintStatus.RESOLVED,
        changedByName: req.user!.name,
        comment: resolutionNotes ? `Issue RESOLVED. Notes: ${resolutionNotes}` : 'Issue resolved. Site cleaned and inspected.'
      }
    });

    // Notify Citizen that their issue is resolved via In-App, Email & WhatsApp!
    await sendNotification({
      userId: complaint.citizenId,
      title: 'Problem Resolved! ✅',
      message: `Your complaint #${complaint.complaintNumber} has been resolved by Officer ${req.user!.name}. Please review and rate your satisfaction.`,
      complaintId: complaint.id,
      eventType: 'RESOLVED',
      remarks: resolutionNotes || 'Issue marked as resolved by field team'
    });

    res.json(updated);
  } catch (error) {
    console.error('Resolve error:', error);
    res.status(500).json({ error: 'Failed to mark complaint as resolved.' });
  }
});

// POST /complaints/:id/reopen - Citizen reopens complaint
router.post('/:id/reopen', authenticate, authorize([Role.CITIZEN]), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const complaintId = req.params.id;
  const citizenId = req.user!.id;
  const { reason } = req.body;

  try {
    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId }
    });

    if (!complaint || complaint.citizenId !== citizenId) {
      res.status(403).json({ error: 'Unauthorized or complaint not found' });
      return;
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: ComplaintStatus.REOPENED,
        resolvedAt: null
      }
    });

    await prisma.statusLog.create({
      data: {
        complaintId,
        oldStatus: ComplaintStatus.RESOLVED,
        newStatus: ComplaintStatus.REOPENED,
        changedByName: req.user!.name,
        comment: `Citizen reopened complaint. Reason: ${reason || 'Issue still persists'}`
      }
    });

    // Notify Staff & trigger External re-open alert
    if (complaint.assignedStaffId) {
      await sendNotification({
        userId: complaint.assignedStaffId,
        title: 'Task Reopened by Citizen ⚠️',
        message: `Citizen was not satisfied with the resolution of #${complaint.complaintNumber} and reopened it. Reason: "${reason || 'Issue persists'}"`,
        complaintId: complaint.id,
        eventType: 'REOPENED',
        remarks: reason || 'Citizen reopened ticket'
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reopen complaint' });
  }
});

export default router;
