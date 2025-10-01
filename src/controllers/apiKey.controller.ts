import { Request, Response } from 'express';
import prisma from '../config/database';
import { generateApiKey } from '../utils/apiKey';

export class ApiKeyController {
  // Get all API keys for the organization
  static async getAllKeys(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const apiKeys = await prisma.apiKey.findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          key: true,
          permissions: true,
          isActive: true,
          lastUsedAt: true,
          createdAt: true
        }
      });

      res.json({ apiKeys });
    } catch (error) {
      console.error('Get API keys error:', error);
      res.status(500).json({ error: 'Failed to fetch API keys' });
    }
  }

  // Create a new API key
  static async createKey(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { name, permissions } = req.body;

      // Validation
      if (!name) {
        res.status(400).json({ error: 'API key name is required' });
        return;
      }

      // Default permissions if not provided
      const keyPermissions = permissions || ['video:read', 'video:write'];

      // Validate permissions
      const validPermissions = ['video:read', 'video:write'];
      const invalidPerms = keyPermissions.filter((p: string) => !validPermissions.includes(p));
      if (invalidPerms.length > 0) {
        res.status(400).json({ error: `Invalid permissions: ${invalidPerms.join(', ')}` });
        return;
      }

      // Generate new API key
      const key = generateApiKey();

      const apiKey = await prisma.apiKey.create({
        data: {
          name,
          key,
          organizationId: req.organizationId,
          permissions: keyPermissions,
          isActive: true
        }
      });

      res.status(201).json({
        message: 'API key created successfully',
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          key: apiKey.key,
          permissions: apiKey.permissions,
          isActive: apiKey.isActive,
          createdAt: apiKey.createdAt
        }
      });
    } catch (error) {
      console.error('Create API key error:', error);
      res.status(500).json({ error: 'Failed to create API key' });
    }
  }

  // Revoke/deactivate an API key
  static async revokeKey(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;

      // Find the API key and verify it belongs to the organization
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          id,
          organizationId: req.organizationId
        }
      });

      if (!apiKey) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      // Deactivate the key
      await prisma.apiKey.update({
        where: { id },
        data: { isActive: false }
      });

      res.json({ message: 'API key revoked successfully' });
    } catch (error) {
      console.error('Revoke API key error:', error);
      res.status(500).json({ error: 'Failed to revoke API key' });
    }
  }

  // Delete an API key permanently
  static async deleteKey(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;

      // Find the API key and verify it belongs to the organization
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          id,
          organizationId: req.organizationId
        }
      });

      if (!apiKey) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      // Delete the key
      await prisma.apiKey.delete({
        where: { id }
      });

      res.json({ message: 'API key deleted successfully' });
    } catch (error) {
      console.error('Delete API key error:', error);
      res.status(500).json({ error: 'Failed to delete API key' });
    }
  }

  // Reactivate an API key
  static async reactivateKey(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { id } = req.params;

      // Find the API key and verify it belongs to the organization
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          id,
          organizationId: req.organizationId
        }
      });

      if (!apiKey) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }

      // Reactivate the key
      await prisma.apiKey.update({
        where: { id },
        data: { isActive: true }
      });

      res.json({ message: 'API key reactivated successfully' });
    } catch (error) {
      console.error('Reactivate API key error:', error);
      res.status(500).json({ error: 'Failed to reactivate API key' });
    }
  }
}
