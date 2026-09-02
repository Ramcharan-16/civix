import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { Role } from '@civix/database';
import { sendWelcomeWhatsAppNotification, normalizePhoneNumber } from '../services/externalMessaging';

const router: Router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'civix-super-secret-jwt-key-2026-xyz';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'civix-super-secret-refresh-jwt-key-2026-abc';

function generateTokens(user: { id: string; email: string; role: Role; name: string }) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRATION || '15m') as any
  });

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as any
  });

  return { accessToken, refreshToken };
}

async function findUserAcrossTables(identifier: string) {
  if (!identifier) return null;
  const rawIdentifier = identifier.trim();
  const digits = rawIdentifier.replace(/[^0-9]/g, '');
  const isPhone = digits.length >= 7;
  const last10Digits = digits.length >= 10 ? digits.slice(-10) : digits;

  // Build match conditions for email and phone
  const searchConditions: any[] = [{ email: rawIdentifier }];
  if (isPhone) {
    searchConditions.push({ phone: { contains: last10Digits } });
  }

  const citizen = await prisma.citizen.findFirst({
    where: { OR: searchConditions }
  });
  if (citizen) return { ...citizen, role: Role.CITIZEN };

  const staff = await prisma.staffMember.findFirst({
    where: { OR: searchConditions },
    include: { department: true }
  });
  if (staff) return { ...staff, role: Role.STAFF };

  const deptAdmin = await prisma.departmentAdmin.findFirst({
    where: { OR: searchConditions },
    include: { department: true }
  });
  if (deptAdmin) return { ...deptAdmin, role: Role.DEPARTMENT_ADMIN };

  const superAdmin = await prisma.superAdmin.findFirst({
    where: { OR: searchConditions }
  });
  if (superAdmin) return { ...superAdmin, role: Role.SUPER_ADMIN };

  return null;
}

// POST /auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, phone, password, role, departmentId, employeeId, designation, address } = req.body;

  if (!name || !email || !phone || !password) {
    res.status(400).json({ error: 'All fields are required (name, email, phone, password)' });
    return;
  }

  try {
    const existing = await findUserAcrossTables(email);
    if (existing) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    let targetRole: Role = Role.CITIZEN;
    if (role && Object.values(Role).includes(role)) {
      targetRole = role as Role;
    }

    let createdUser: { id: string; name: string; email: string; phone: string; role: Role };

    if (targetRole === Role.SUPER_ADMIN) {
      const sa = await prisma.superAdmin.create({
        data: { name, email, phone, password, passwordHash, roleTitle: designation || 'Super Administrator' }
      });
      createdUser = { ...sa, role: Role.SUPER_ADMIN };
    } else if (targetRole === Role.DEPARTMENT_ADMIN) {
      let deptId = departmentId;
      if (!deptId) {
        const firstDept = await prisma.department.findFirst();
        deptId = firstDept?.id;
      }
      if (!deptId) {
        res.status(400).json({ error: 'A valid department is required for Department Admin' });
        return;
      }
      const count = await prisma.departmentAdmin.count();
      const da = await prisma.departmentAdmin.create({
        data: {
          employeeId: employeeId || `DADM-${(count + 1).toString().padStart(3, '0')}`,
          name,
          email,
          phone,
          password,
          passwordHash,
          departmentId: deptId,
          designation: designation || 'Department Admin'
        }
      });
      createdUser = { ...da, role: Role.DEPARTMENT_ADMIN };
    } else if (targetRole === Role.STAFF) {
      let deptId = departmentId;
      if (!deptId) {
        const firstDept = await prisma.department.findFirst();
        deptId = firstDept?.id;
      }
      if (!deptId) {
        res.status(400).json({ error: 'A valid department is required for Staff' });
        return;
      }
      const count = await prisma.staffMember.count();
      const staff = await prisma.staffMember.create({
        data: {
          employeeId: employeeId || `STF-${(count + 1).toString().padStart(3, '0')}`,
          name,
          email,
          phone,
          password,
          passwordHash,
          departmentId: deptId,
          designation: designation || 'Field Staff'
        }
      });
      createdUser = { ...staff, role: Role.STAFF };
    } else {
      const citizen = await prisma.citizen.create({
        data: {
          name,
          email,
          phone,
          password,
          passwordHash,
          address
        }
      });
      createdUser = { ...citizen, role: Role.CITIZEN };
    }

    // Automatically send WhatsApp Welcome notification to the newly registered user's phone
    if (createdUser.phone) {
      sendWelcomeWhatsAppNotification({
        name: createdUser.name,
        email: createdUser.email,
        phone: createdUser.phone,
        role: createdUser.role
      }).catch((waErr) => {
        console.warn('[AuthService] Welcome WhatsApp notification error:', waErr);
      });
    }

    const tokens = generateTokens(createdUser);

    res.status(201).json({
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        phone: createdUser.phone,
        role: createdUser.role
      },
      ...tokens
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, identifier, phone, password } = req.body;
  const userIdentifier = identifier || email || phone;

  if (!userIdentifier || !password) {
    res.status(400).json({ error: 'Email/Phone and password are required' });
    return;
  }

  try {
    const user = await findUserAcrossTables(userIdentifier);
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials. User not found.' });
      return;
    }

    let isMatch = false;
    if (user.passwordHash) {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    }

    // Direct plain password fallback (allows updating password directly in MySQL without hashes)
    if (!isMatch && (user as any).password && (user as any).password === password) {
      isMatch = true;
      const salt = await bcrypt.genSalt(10);
      const newHash = await bcrypt.hash(password, salt);
      if (user.role === Role.CITIZEN) {
        await prisma.citizen.update({ where: { id: user.id }, data: { passwordHash: newHash, password } });
      } else if (user.role === Role.STAFF) {
        await prisma.staffMember.update({ where: { id: user.id }, data: { passwordHash: newHash, password } });
      } else if (user.role === Role.DEPARTMENT_ADMIN) {
        await prisma.departmentAdmin.update({ where: { id: user.id }, data: { passwordHash: newHash, password } });
      } else if (user.role === Role.SUPER_ADMIN) {
        await prisma.superAdmin.update({ where: { id: user.id }, data: { passwordHash: newHash, password } });
      }
    }

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email/phone or password' });
      return;
    }

    const tokens = generateTokens(user);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token is required' });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
      id: string;
      email: string;
      role: Role;
      name: string;
    };

    const user = await findUserAcrossTables(decoded.email);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /auth/logout
router.post('/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
