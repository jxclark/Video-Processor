import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { generateApiKey } from '../utils/apiKey';
import { AuditService } from '../services/audit.service';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const SALT_ROUNDS = 10;

export class AuthController {
  // Signup - Create organization and owner user
  static async signup(req: Request, res: Response): Promise<void> {
    try {
      const { organizationName, email, password, name } = req.body;

      // Validation
      if (!organizationName || !email || !password || !name) {
        res.status(400).json({ error: 'All fields are required' });
        return;
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create organization and user in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create organization
        const organization = await tx.organization.create({
          data: {
            name: organizationName,
            email: email,
            plan: 'free',
            status: 'active'
          }
        });

        // Create owner user
        const user = await tx.user.create({
          data: {
            email,
            name,
            passwordHash,
            role: 'owner',
            organizationId: organization.id
          }
        });

        // Create initial API key
        const apiKey = generateApiKey();
        await tx.apiKey.create({
          data: {
            name: 'Default API Key',
            key: apiKey,
            organizationId: organization.id,
            permissions: ['video:read', 'video:write']
          }
        });

        return { organization, user, apiKey };
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: result.user.id,
          organizationId: result.organization.id,
          role: result.user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Organization created successfully',
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          plan: result.organization.plan
        },
        apiKey: result.apiKey
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  }

  // Login
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          organization: true
        }
      });

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Check if organization is active
      if (user.organization.status !== 'active') {
        res.status(403).json({ error: 'Organization account is not active' });
        return;
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Log login event
      await AuditService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'user.login',
        resourceType: 'user',
        resourceId: user.id,
        req
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          organizationId: user.organizationId,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          plan: user.organization.plan
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  // Get current user info
  static async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: {
          organization: true
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          email: user.organization.email,
          plan: user.organization.plan,
          status: user.organization.status
        }
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to fetch user info' });
    }
  }
}
