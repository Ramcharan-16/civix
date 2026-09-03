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

let cachedDefaultDepartmentId: string | null = null;
let lastDeptCacheTimestamp = 0;

async function resolveDepartmentId(requestedDeptId?: string): Promise<string | null> {
  if (requestedDeptId) return requestedDeptId;
  const now = Date.now();
  if (cachedDefaultDepartmentId && (now - lastDeptCacheTimestamp < 300000)) {
    return cachedDefaultDepartmentId;
  }
  const dept = await prisma.department.findFirst({ select: { id: true } });
  if (dept) {
    cachedDefaultDepartmentId = dept.id;
    lastDeptCacheTimestamp = now;
    return dept.id;
  }
  return null;
}

async function findUserAcrossTables(identifier: string) {
  if (!identifier) return null;
  const rawIdentifier = identifier.trim();
  const lowerIdentifier = rawIdentifier.toLowerCase();
  const digits = rawIdentifier.replace(/[^0-9]/g, '');
  const isEmail = lowerIdentifier.includes('@');
  const isPhone = digits.length >= 7;
  const last10Digits = digits.length >= 10 ? digits.slice(-10) : digits;

  // 1. Ultra-fast path: If identifier is an email, use direct indexed B-Tree unique lookups
  if (isEmail) {
    const [citizen, staff, deptAdmin, superAdmin] = await Promise.all([
      prisma.citizen.findUnique({ where: { email: lowerIdentifier } }),
      prisma.staffMember.findUnique({ where: { email: lowerIdentifier } }),
      prisma.departmentAdmin.findUnique({ where: { email: lowerIdentifier } }),
      prisma.superAdmin.findUnique({ where: { email: lowerIdentifier } })
    ]);

    if (citizen) return { ...citizen, role: Role.CITIZEN };
    if (staff) return { ...staff, role: Role.STAFF };
    if (deptAdmin) return { ...deptAdmin, role: Role.DEPARTMENT_ADMIN };
    if (superAdmin) return { ...superAdmin, role: Role.SUPER_ADMIN };

    return null;
  }

  // 2. Phone or Employee ID path
  const phoneVariants = isPhone
    ? Array.from(new Set([rawIdentifier, digits, last10Digits, `+91${last10Digits}`, `91${last10Digits}`, `+${digits}`]))
    : [rawIdentifier];

  const [citizen, staff, deptAdmin, superAdmin] = await Promise.all([
    prisma.citizen.findFirst({
      where: {
        OR: [
          { email: lowerIdentifier },
          { phone: { in: phoneVariants } }
        ]
      }
    }),
    prisma.staffMember.findFirst({
      where: {
        OR: [
          { email: lowerIdentifier },
          { employeeId: rawIdentifier },
          { phone: { in: phoneVariants } }
        ]
      }
    }),
    prisma.departmentAdmin.findFirst({
      where: {
        OR: [
          { email: lowerIdentifier },
          { employeeId: rawIdentifier },
          { phone: { in: phoneVariants } }
        ]
      }
    }),
    prisma.superAdmin.findFirst({
      where: {
        OR: [
          { email: lowerIdentifier },
          { phone: { in: phoneVariants } }
        ]
      }
    })
  ]);

  if (citizen) return { ...citizen, role: Role.CITIZEN };
  if (staff) return { ...staff, role: Role.STAFF };
  if (deptAdmin) return { ...deptAdmin, role: Role.DEPARTMENT_ADMIN };
  if (superAdmin) return { ...superAdmin, role: Role.SUPER_ADMIN };

  return null;
}

async function checkUserExistsFast(email: string, phone?: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  
  // Direct indexed point lookups on unique email column across 4 tables in parallel
  const [cEmail, sEmail, dEmail, saEmail] = await Promise.all([
    prisma.citizen.findUnique({ where: { email: cleanEmail }, select: { id: true } }),
    prisma.staffMember.findUnique({ where: { email: cleanEmail }, select: { id: true } }),
    prisma.departmentAdmin.findUnique({ where: { email: cleanEmail }, select: { id: true } }),
    prisma.superAdmin.findUnique({ where: { email: cleanEmail }, select: { id: true } })
  ]);

  if (cEmail || sEmail || dEmail || saEmail) return true;

  if (phone) {
    const rawPhone = phone.trim();
    const digits = rawPhone.replace(/[^0-9]/g, '');
    const last10Digits = digits.length >= 10 ? digits.slice(-10) : digits;
    const phoneVariants = digits.length >= 7
      ? Array.from(new Set([rawPhone, digits, last10Digits, `+91${last10Digits}`, `91${last10Digits}`, `+${digits}`]))
      : [rawPhone];

    const [cPhone, sPhone, dPhone] = await Promise.all([
      prisma.citizen.findFirst({ where: { phone: { in: phoneVariants } }, select: { id: true } }),
      prisma.staffMember.findFirst({ where: { phone: { in: phoneVariants } }, select: { id: true } }),
      prisma.departmentAdmin.findFirst({ where: { phone: { in: phoneVariants } }, select: { id: true } })
    ]);

    if (cPhone || sPhone || dPhone) return true;
  }

  return false;
}

// POST /auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, phone, password, role, departmentId, employeeId, designation, address } = req.body;

  if (!name || !email || !phone || !password) {
    res.status(400).json({ error: 'All fields are required (name, email, phone, password)' });
    return;
  }

  try {
    // Run duplicate user check and password hashing concurrently with fast salt
    const [alreadyExists, passwordHash] = await Promise.all([
      checkUserExistsFast(email, phone),
      bcrypt.hash(password, 8)
    ]);

    if (alreadyExists) {
      res.status(400).json({ error: 'An account with this email or mobile number already exists' });
      return;
    }

    let targetRole: Role = Role.CITIZEN;
    if (role && Object.values(Role).includes(role)) {
      targetRole = role as Role;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    let createdUser: { id: string; name: string; email: string; phone: string; role: Role };

    if (targetRole === Role.SUPER_ADMIN) {
      const sa = await prisma.superAdmin.create({
        data: { name: name.trim(), email: cleanEmail, phone: cleanPhone, password, passwordHash, roleTitle: designation || 'Super Administrator' }
      });
      createdUser = { ...sa, role: Role.SUPER_ADMIN };
    } else if (targetRole === Role.DEPARTMENT_ADMIN) {
      const deptId = await resolveDepartmentId(departmentId);
      if (!deptId) {
        res.status(400).json({ error: 'A valid department is required for Department Admin' });
        return;
      }
      const uniqueSuffix = `${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
      const da = await prisma.departmentAdmin.create({
        data: {
          employeeId: employeeId || `DADM-${uniqueSuffix}`,
          name: name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          password,
          passwordHash,
          departmentId: deptId,
          designation: designation || 'Department Admin'
        }
      });
      createdUser = { ...da, role: Role.DEPARTMENT_ADMIN };
    } else if (targetRole === Role.STAFF) {
      const deptId = await resolveDepartmentId(departmentId);
      if (!deptId) {
        res.status(400).json({ error: 'A valid department is required for Staff' });
        return;
      }
      const uniqueSuffix = `${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
      const staff = await prisma.staffMember.create({
        data: {
          employeeId: employeeId || `STF-${uniqueSuffix}`,
          name: name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
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
          name: name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          password,
          passwordHash,
          address: address || null
        }
      });
      createdUser = { ...citizen, role: Role.CITIZEN };
    }

    // Fire WhatsApp Welcome notification in a detached background worker
    if (createdUser.phone) {
      setImmediate(() => {
        sendWelcomeWhatsAppNotification({
          name: createdUser.name,
          email: createdUser.email,
          phone: createdUser.phone,
          role: createdUser.role
        }).catch((waErr) => {
          console.warn('[AuthService] Welcome WhatsApp notification background error:', waErr);
        });
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
