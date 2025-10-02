import { Request } from 'express';
import prisma from '../config/database';

export class AuditService {
  /**
   * Log an action to audit trail
   */
  static async log(params: {
    organizationId: string;
    userId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: any;
    req?: Request;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          ipAddress: params.req?.ip || params.req?.headers['x-forwarded-for'] as string,
          userAgent: params.req?.headers['user-agent'],
          metadata: params.metadata
        }
      });
    } catch (error) {
      // Don't fail the request if audit logging fails
      console.error('Audit log error:', error);
    }
  }

  /**
   * Get audit logs for organization
   */
  static async getOrganizationLogs(
    organizationId: string,
    options?: {
      limit?: number;
      offset?: number;
      userId?: string;
      action?: string;
    }
  ) {
    const where: any = { organizationId };
    
    if (options?.userId) {
      where.userId = options.userId;
    }
    
    if (options?.action) {
      where.action = options.action;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0
    });

    return logs;
  }

  /**
   * Get user activity
   */
  static async getUserActivity(userId: string, limit = 20) {
    return await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}
