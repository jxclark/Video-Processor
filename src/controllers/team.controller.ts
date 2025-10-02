import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/database';
import { AuditService } from '../services/audit.service';

export class TeamController {
  /**
   * Get all team members
   */
  static async getTeamMembers(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const members = await prisma.user.findMany({
        where: { organizationId: req.organizationId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isEmailVerified: true,
          lastLoginAt: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json({ members });
    } catch (error) {
      console.error('Get team members error:', error);
      res.status(500).json({ error: 'Failed to fetch team members' });
    }
  }

  /**
   * Invite a new team member
   */
  static async inviteTeamMember(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId || !req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { email, role } = req.body;

      // Validation
      if (!email || !role) {
        res.status(400).json({ error: 'Email and role are required' });
        return;
      }

      // Validate role
      const validRoles = ['admin', 'member', 'viewer'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: 'Invalid role. Must be admin, member, or viewer' });
        return;
      }

      // Check if user already exists in organization
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          organizationId: req.organizationId
        }
      });

      if (existingUser) {
        res.status(400).json({ error: 'User already exists in this organization' });
        return;
      }

      // Check if there's already a pending invite
      const existingInvite = await prisma.teamInvite.findFirst({
        where: {
          organizationId: req.organizationId,
          email,
          status: 'pending'
        }
      });

      if (existingInvite) {
        res.status(400).json({ error: 'Invite already sent to this email' });
        return;
      }

      // Generate invite token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

      // Create invite
      const invite = await prisma.teamInvite.create({
        data: {
          organizationId: req.organizationId,
          email,
          role,
          invitedById: req.userId,
          token,
          expiresAt
        }
      });

      // Log the invite
      await AuditService.log({
        organizationId: req.organizationId,
        userId: req.userId,
        action: 'team.invite',
        resourceType: 'invite',
        resourceId: invite.id,
        metadata: { email, role },
        req
      });

      // TODO: Send email with invite link
      // For now, return the token (in production, send via email)
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/accept-invite?token=${token}`;

      res.status(201).json({
        message: 'Team member invited successfully',
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt
        },
        inviteLink // Remove this in production
      });
    } catch (error) {
      console.error('Invite team member error:', error);
      res.status(500).json({ error: 'Failed to invite team member' });
    }
  }

  /**
   * Accept team invite
   */
  static async acceptInvite(req: Request, res: Response): Promise<void> {
    try {
      const { token, name, password } = req.body;

      if (!token || !name || !password) {
        res.status(400).json({ error: 'Token, name, and password are required' });
        return;
      }

      // Find invite
      const invite = await prisma.teamInvite.findUnique({
        where: { token },
        include: { invitedBy: true }
      });

      if (!invite) {
        res.status(404).json({ error: 'Invalid invite token' });
        return;
      }

      if (invite.status !== 'pending') {
        res.status(400).json({ error: 'Invite has already been used' });
        return;
      }

      if (new Date() > invite.expiresAt) {
        res.status(400).json({ error: 'Invite has expired' });
        return;
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: invite.email }
      });

      if (existingUser) {
        res.status(400).json({ error: 'User with this email already exists' });
        return;
      }

      // Hash password
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user and update invite in transaction
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: invite.email,
            name,
            passwordHash,
            role: invite.role,
            organizationId: invite.organizationId,
            isEmailVerified: true
          }
        });

        await tx.teamInvite.update({
          where: { id: invite.id },
          data: { status: 'accepted' }
        });

        return user;
      });

      // Log the acceptance
      await AuditService.log({
        organizationId: invite.organizationId,
        userId: result.id,
        action: 'team.invite.accepted',
        resourceType: 'user',
        resourceId: result.id,
        req
      });

      res.status(201).json({
        message: 'Invite accepted successfully',
        user: {
          id: result.id,
          email: result.email,
          name: result.name,
          role: result.role
        }
      });
    } catch (error) {
      console.error('Accept invite error:', error);
      res.status(500).json({ error: 'Failed to accept invite' });
    }
  }

  /**
   * Update team member role
   */
  static async updateMemberRole(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId || !req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { userId } = req.params;
      const { role } = req.body;

      // Validation
      const validRoles = ['admin', 'member', 'viewer'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: 'Invalid role' });
        return;
      }

      // Find the user
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          organizationId: req.organizationId
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Cannot change owner role
      if (user.role === 'owner') {
        res.status(403).json({ error: 'Cannot change owner role' });
        return;
      }

      // Update role
      await prisma.user.update({
        where: { id: userId },
        data: { role }
      });

      // Log the change
      await AuditService.log({
        organizationId: req.organizationId,
        userId: req.userId,
        action: 'team.role.updated',
        resourceType: 'user',
        resourceId: userId,
        metadata: { oldRole: user.role, newRole: role },
        req
      });

      res.json({ message: 'Role updated successfully' });
    } catch (error) {
      console.error('Update member role error:', error);
      res.status(500).json({ error: 'Failed to update role' });
    }
  }

  /**
   * Remove team member
   */
  static async removeMember(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId || !req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { userId } = req.params;

      // Find the user
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          organizationId: req.organizationId
        }
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Cannot remove owner
      if (user.role === 'owner') {
        res.status(403).json({ error: 'Cannot remove organization owner' });
        return;
      }

      // Cannot remove yourself
      if (userId === req.userId) {
        res.status(403).json({ error: 'Cannot remove yourself' });
        return;
      }

      // Delete user
      await prisma.user.delete({
        where: { id: userId }
      });

      // Log the removal
      await AuditService.log({
        organizationId: req.organizationId,
        userId: req.userId,
        action: 'team.member.removed',
        resourceType: 'user',
        resourceId: userId,
        metadata: { email: user.email, role: user.role },
        req
      });

      res.json({ message: 'Team member removed successfully' });
    } catch (error) {
      console.error('Remove member error:', error);
      res.status(500).json({ error: 'Failed to remove team member' });
    }
  }

  /**
   * Get pending invites
   */
  static async getPendingInvites(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const invites = await prisma.teamInvite.findMany({
        where: {
          organizationId: req.organizationId,
          status: 'pending',
          expiresAt: { gt: new Date() }
        },
        include: {
          invitedBy: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({ invites });
    } catch (error) {
      console.error('Get pending invites error:', error);
      res.status(500).json({ error: 'Failed to fetch invites' });
    }
  }
}
