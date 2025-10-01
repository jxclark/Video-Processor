import prisma from '../config/database';

// Plan limits
const PLAN_LIMITS = {
  free: {
    videosPerMonth: 10,
    minutesPerMonth: 60, // 1 hour
    storageGB: 5,
    apiCallsPerMonth: 1000
  },
  starter: {
    videosPerMonth: 100,
    minutesPerMonth: 600, // 10 hours
    storageGB: 50,
    apiCallsPerMonth: 10000
  },
  pro: {
    videosPerMonth: 1000,
    minutesPerMonth: 6000, // 100 hours
    storageGB: 500,
    apiCallsPerMonth: 100000
  },
  enterprise: {
    videosPerMonth: -1, // unlimited
    minutesPerMonth: -1,
    storageGB: -1,
    apiCallsPerMonth: -1
  }
};

export class UsageService {
  /**
   * Get current month in YYYY-MM format
   */
  private static getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Get or create usage record for current month
   */
  static async getOrCreateUsage(organizationId: string) {
    const month = this.getCurrentMonth();

    let usage = await prisma.usage.findUnique({
      where: {
        organizationId_month: {
          organizationId,
          month
        }
      }
    });

    if (!usage) {
      usage = await prisma.usage.create({
        data: {
          organizationId,
          month
        }
      });
    }

    return usage;
  }

  /**
   * Check if organization can upload more videos
   */
  static async canUploadVideo(organizationId: string): Promise<{ allowed: boolean; reason?: string }> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!org) {
      return { allowed: false, reason: 'Organization not found' };
    }

    const limits = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS];
    if (!limits) {
      return { allowed: false, reason: 'Invalid plan' };
    }

    // Enterprise has unlimited
    if (limits.videosPerMonth === -1) {
      return { allowed: true };
    }

    const usage = await this.getOrCreateUsage(organizationId);

    if (usage.videosUploaded >= limits.videosPerMonth) {
      return { 
        allowed: false, 
        reason: `Monthly video upload limit reached (${limits.videosPerMonth} videos)` 
      };
    }

    return { allowed: true };
  }

  /**
   * Check if organization has enough storage
   */
  static async hasStorageCapacity(organizationId: string, additionalBytes: number): Promise<{ allowed: boolean; reason?: string }> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!org) {
      return { allowed: false, reason: 'Organization not found' };
    }

    const limits = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS];
    if (!limits) {
      return { allowed: false, reason: 'Invalid plan' };
    }

    // Enterprise has unlimited
    if (limits.storageGB === -1) {
      return { allowed: true };
    }

    const usage = await this.getOrCreateUsage(organizationId);
    const maxStorageBytes = BigInt(limits.storageGB) * BigInt(1024 * 1024 * 1024);
    const newTotal = usage.storageUsed + BigInt(additionalBytes);

    if (newTotal > maxStorageBytes) {
      return { 
        allowed: false, 
        reason: `Storage limit exceeded (${limits.storageGB}GB)` 
      };
    }

    return { allowed: true };
  }

  /**
   * Track video upload
   */
  static async trackVideoUpload(organizationId: string, fileSize: bigint, duration?: number) {
    const usage = await this.getOrCreateUsage(organizationId);

    await prisma.usage.update({
      where: { id: usage.id },
      data: {
        videosUploaded: { increment: 1 },
        storageUsed: { increment: fileSize },
        minutesProcessed: duration ? { increment: duration / 60 } : undefined
      }
    });
  }

  /**
   * Track video deletion (reduce storage)
   */
  static async trackVideoDeletion(organizationId: string, fileSize: bigint) {
    const usage = await this.getOrCreateUsage(organizationId);

    await prisma.usage.update({
      where: { id: usage.id },
      data: {
        storageUsed: { decrement: fileSize }
      }
    });
  }

  /**
   * Track API call
   */
  static async trackApiCall(organizationId: string) {
    const usage = await this.getOrCreateUsage(organizationId);

    await prisma.usage.update({
      where: { id: usage.id },
      data: {
        apiCalls: { increment: 1 }
      }
    });
  }

  /**
   * Get usage statistics for organization
   */
  static async getUsageStats(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    const usage = await this.getOrCreateUsage(organizationId);
    const limits = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS];

    return {
      current: {
        videosUploaded: usage.videosUploaded,
        minutesProcessed: usage.minutesProcessed,
        storageUsedGB: Number(usage.storageUsed) / (1024 * 1024 * 1024),
        apiCalls: usage.apiCalls
      },
      limits: {
        videosPerMonth: limits.videosPerMonth,
        minutesPerMonth: limits.minutesPerMonth,
        storageGB: limits.storageGB,
        apiCallsPerMonth: limits.apiCallsPerMonth
      },
      plan: org.plan,
      month: usage.month
    };
  }
}
