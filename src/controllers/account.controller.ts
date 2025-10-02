import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { AuditService } from '../services/audit.service';

const SALT_ROUNDS = 10;

export class AccountController {
  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { name, email } = req.body;

      if (!name && !email) {
        res.status(400).json({ error: 'At least one field (name or email) is required' });
        return;
      }

      // If email is being changed, check if it's already taken
      if (email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email,
            id: { not: req.userId }
          }
        });

        if (existingUser) {
          res.status(400).json({ error: 'Email already in use' });
          return;
        }
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) {
        updateData.email = email;
        updateData.isEmailVerified = false; // Require re-verification
      }

      const user = await prisma.user.update({
        where: { id: req.userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isEmailVerified: true
        }
      });

      // Log the update
      await AuditService.log({
        organizationId: req.organizationId!,
        userId: req.userId,
        action: 'user.profile.updated',
        resourceType: 'user',
        resourceId: req.userId,
        metadata: { fields: Object.keys(updateData) },
        req
      });

      res.json({
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required' });
        return;
      }

      if (newPassword.length < 8) {
        res.status(400).json({ error: 'New password must be at least 8 characters' });
        return;
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: req.userId }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update password
      await prisma.user.update({
        where: { id: req.userId },
        data: { passwordHash }
      });

      // Log the change
      await AuditService.log({
        organizationId: req.organizationId!,
        userId: req.userId,
        action: 'user.password.changed',
        resourceType: 'user',
        resourceId: req.userId,
        req
      });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }

  /**
   * Get organization settings
   */
  static async getOrganizationSettings(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const organization = await prisma.organization.findUnique({
        where: { id: req.organizationId },
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!organization) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      res.json({ organization });
    } catch (error) {
      console.error('Get organization settings error:', error);
      res.status(500).json({ error: 'Failed to fetch organization settings' });
    }
  }

  /**
   * Update organization settings (owner only)
   */
  static async updateOrganizationSettings(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId || !req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { name, email } = req.body;

      if (!name && !email) {
        res.status(400).json({ error: 'At least one field (name or email) is required' });
        return;
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;

      const organization = await prisma.organization.update({
        where: { id: req.organizationId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          status: true
        }
      });

      // Log the update
      await AuditService.log({
        organizationId: req.organizationId,
        userId: req.userId,
        action: 'organization.settings.updated',
        resourceType: 'organization',
        resourceId: req.organizationId,
        metadata: { fields: Object.keys(updateData) },
        req
      });

      res.json({
        message: 'Organization settings updated successfully',
        organization
      });
    } catch (error) {
      console.error('Update organization settings error:', error);
      res.status(500).json({ error: 'Failed to update organization settings' });
    }
  }

  /**
   * Get user's audit logs
   */
  static async getMyActivity(req: Request, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      
      const activity = await AuditService.getUserActivity(req.userId, limit);

      res.json({ activity });
    } catch (error) {
      console.error('Get activity error:', error);
      res.status(500).json({ error: 'Failed to fetch activity' });
    }
  }
}
