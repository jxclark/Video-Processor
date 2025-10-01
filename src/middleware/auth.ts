import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { isValidApiKeyFormat } from '../utils/apiKey';

// Extend Express Request to include organization
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      apiKeyId?: string;
    }
  }
}

/**
 * Middleware to authenticate API requests using API keys
 */
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get API key from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ error: 'Missing API key. Include Authorization header with Bearer token.' });
      return;
    }

    // Extract key from "Bearer <key>" format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Invalid Authorization header format. Use: Bearer <api_key>' });
      return;
    }

    const apiKey = parts[1];

    // Validate key format
    if (!isValidApiKeyFormat(apiKey)) {
      res.status(401).json({ error: 'Invalid API key format' });
      return;
    }

    // Look up API key in database
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        organization: true
      }
    });

    if (!keyRecord) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    // Check if key is active
    if (!keyRecord.isActive) {
      res.status(401).json({ error: 'API key is inactive' });
      return;
    }

    // Check if organization is active
    if (keyRecord.organization.status !== 'active') {
      res.status(403).json({ error: 'Organization account is not active' });
      return;
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() }
    });

    // Attach organization ID to request
    req.organizationId = keyRecord.organizationId;
    req.apiKeyId = keyRecord.id;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if API key has specific permission
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.apiKeyId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const keyRecord = await prisma.apiKey.findUnique({
        where: { id: req.apiKeyId }
      });

      if (!keyRecord || !keyRecord.permissions.includes(permission)) {
        res.status(403).json({ error: `Missing required permission: ${permission}` });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};
