import { Request, Response, NextFunction } from 'express';

// Role hierarchy: owner > admin > member > viewer
const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1
};

// Permission definitions for each role
const ROLE_PERMISSIONS = {
  owner: [
    'org:update',
    'org:delete',
    'billing:manage',
    'team:invite',
    'team:remove',
    'team:update-role',
    'apikey:create',
    'apikey:delete',
    'apikey:revoke',
    'video:upload',
    'video:delete',
    'video:read',
    'settings:manage',
    'audit:read'
  ],
  admin: [
    'team:invite',
    'team:remove',
    'team:update-role',
    'apikey:create',
    'apikey:delete',
    'apikey:revoke',
    'video:upload',
    'video:delete',
    'video:read',
    'settings:manage',
    'audit:read'
  ],
  member: [
    'video:upload',
    'video:delete',
    'video:read',
    'apikey:create',
    'apikey:delete'
  ],
  viewer: [
    'video:read'
  ]
};

/**
 * Check if user has required permission
 */
export const hasPermission = (userRole: string, permission: string): boolean => {
  const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];
  return permissions ? permissions.includes(permission) : false;
};

/**
 * Check if user has minimum required role
 */
export const hasMinimumRole = (userRole: string, requiredRole: string): boolean => {
  const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Middleware to require specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!hasPermission(req.userRole, permission)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        role: req.userRole
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require minimum role
 */
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!hasMinimumRole(req.userRole, role)) {
      res.status(403).json({ 
        error: 'Insufficient role',
        required: role,
        current: req.userRole
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require owner role
 */
export const requireOwner = requireRole('owner');

/**
 * Middleware to require admin or higher
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to require member or higher
 */
export const requireMember = requireRole('member');
