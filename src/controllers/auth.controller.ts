import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/database';
import { generateApiKey } from '../utils/apiKey';
import { AuditService } from '../services/audit.service';
import { EmailService } from '../services/email.service';

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

      // Generate email verification token
      const emailVerifyToken = crypto.randomBytes(32).toString('hex');

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
            organizationId: organization.id,
            emailVerifyToken
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

      // Send verification email (don't wait for it)
      EmailService.sendVerificationEmail(email, name, emailVerifyToken).catch(err => {
        console.error('Failed to send verification email:', err);
      });

      res.status(201).json({
        message: 'Account created successfully! Please check your email to verify your account.',
        needsVerification: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name
        }
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

      // Check if email is verified
      if (!user.isEmailVerified) {
        res.status(403).json({ 
          error: 'Please verify your email address before logging in',
          needsVerification: true
        });
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

  // Verify email
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Verification token is required' });
        return;
      }

      // Find user with this token
      const user = await prisma.user.findFirst({
        where: { emailVerifyToken: token }
      });

      if (!user) {
        res.status(404).json({ error: 'Invalid verification token' });
        return;
      }

      if (user.isEmailVerified) {
        res.status(400).json({ error: 'Email already verified' });
        return;
      }

      // Verify email
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerifyToken: null
        }
      });

      // Log the verification
      await AuditService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'user.email.verified',
        resourceType: 'user',
        resourceId: user.id,
        req
      });

      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({ error: 'Failed to verify email' });
    }
  }

  // Request password reset
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      // Don't reveal if user exists or not (security best practice)
      if (!user) {
        res.json({ message: 'If an account exists, a password reset link has been sent' });
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiration

      // Save token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpires
        }
      });

      // Send reset email (don't wait for it)
      EmailService.sendPasswordResetEmail(email, user.name, resetToken).catch(err => {
        console.error('Failed to send password reset email:', err);
      });

      // Log the request
      await AuditService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'user.password.reset.requested',
        resourceType: 'user',
        resourceId: user.id,
        req
      });

      res.json({ message: 'If an account exists, a password reset link has been sent' });
    } catch (error) {
      console.error('Request password reset error:', error);
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  }

  // Reset password
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({ error: 'Token and new password are required' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }

      // Find user with valid token
      const user = await prisma.user.findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { gt: new Date() }
        }
      });

      if (!user) {
        res.status(404).json({ error: 'Invalid or expired reset token' });
        return;
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          resetPasswordToken: null,
          resetPasswordExpires: null
        }
      });

      // Log the reset
      await AuditService.log({
        organizationId: user.organizationId,
        userId: user.id,
        action: 'user.password.reset.completed',
        resourceType: 'user',
        resourceId: user.id,
        req
      });

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }

  // Resend verification email
  static async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.isEmailVerified) {
        res.status(400).json({ error: 'Email already verified' });
        return;
      }

      // Generate new token if needed
      let token = user.emailVerifyToken;
      if (!token) {
        token = crypto.randomBytes(32).toString('hex');
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerifyToken: token }
        });
      }

      // Send verification email
      await EmailService.sendVerificationEmail(user.email, user.name, token);

      res.json({ message: 'Verification email sent' });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ error: 'Failed to resend verification email' });
    }
  }
}
