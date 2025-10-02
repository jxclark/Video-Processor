import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuditService } from '../services/audit.service';
import { PLANS, getPlan, canUpgrade, canDowngrade } from '../config/plans';

export class BillingController {
  /**
   * Get all available plans
   */
  static async getPlans(req: Request, res: Response): Promise<void> {
    try {
      res.json({ plans: Object.values(PLANS) });
    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({ error: 'Failed to fetch plans' });
    }
  }

  /**
   * Get current plan details
   */
  static async getCurrentPlan(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const organization = await prisma.organization.findUnique({
        where: { id: req.organizationId }
      });

      if (!organization) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const plan = getPlan(organization.plan);

      res.json({
        currentPlan: organization.plan,
        plan
      });
    } catch (error) {
      console.error('Get current plan error:', error);
      res.status(500).json({ error: 'Failed to fetch current plan' });
    }
  }

  /**
   * Change plan (upgrade or downgrade)
   */
  static async changePlan(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId || !req.userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { newPlan } = req.body;

      if (!newPlan) {
        res.status(400).json({ error: 'New plan is required' });
        return;
      }

      // Validate plan exists
      if (!PLANS[newPlan]) {
        res.status(400).json({ error: 'Invalid plan' });
        return;
      }

      // Get current organization
      const organization = await prisma.organization.findUnique({
        where: { id: req.organizationId }
      });

      if (!organization) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const currentPlan = organization.plan;

      // Check if same plan
      if (currentPlan === newPlan) {
        res.status(400).json({ error: 'Already on this plan' });
        return;
      }

      // Determine if upgrade or downgrade
      const isUpgrade = canUpgrade(currentPlan, newPlan);
      const isDowngrade = canDowngrade(currentPlan, newPlan);

      if (!isUpgrade && !isDowngrade) {
        res.status(400).json({ error: 'Invalid plan change' });
        return;
      }

      // Check team member limit for downgrade
      if (isDowngrade) {
        const newPlanLimits = PLANS[newPlan].limits;
        
        // Count current team members
        const teamMemberCount = await prisma.user.count({
          where: { organizationId: req.organizationId }
        });

        if (newPlanLimits.maxTeamMembers !== -1 && teamMemberCount > newPlanLimits.maxTeamMembers) {
          res.status(400).json({ 
            error: `Cannot downgrade: You have ${teamMemberCount} team members but the ${PLANS[newPlan].name} plan allows only ${newPlanLimits.maxTeamMembers}. Please remove team members first.`
          });
          return;
        }

        // Check storage usage
        const usage = await prisma.usage.findFirst({
          where: { organizationId: req.organizationId },
          orderBy: { createdAt: 'desc' }
        });

        if (usage) {
          const storageUsedGB = Number(usage.storageUsed) / (1024 * 1024 * 1024);
          if (storageUsedGB > newPlanLimits.storageGB) {
            res.status(400).json({
              error: `Cannot downgrade: You're using ${storageUsedGB.toFixed(2)}GB but the ${PLANS[newPlan].name} plan allows only ${newPlanLimits.storageGB}GB. Please delete some videos first.`
            });
            return;
          }
        }
      }

      // Update plan
      await prisma.organization.update({
        where: { id: req.organizationId },
        data: { plan: newPlan }
      });

      // Log the change
      await AuditService.log({
        organizationId: req.organizationId,
        userId: req.userId,
        action: isUpgrade ? 'billing.plan.upgraded' : 'billing.plan.downgraded',
        resourceType: 'organization',
        resourceId: req.organizationId,
        metadata: { 
          oldPlan: currentPlan, 
          newPlan,
          oldPrice: PLANS[currentPlan].price,
          newPrice: PLANS[newPlan].price
        },
        req
      });

      res.json({
        message: `Successfully ${isUpgrade ? 'upgraded' : 'downgraded'} to ${PLANS[newPlan].name} plan`,
        plan: PLANS[newPlan]
      });
    } catch (error) {
      console.error('Change plan error:', error);
      res.status(500).json({ error: 'Failed to change plan' });
    }
  }

  /**
   * Get usage with limits
   */
  static async getUsageWithLimits(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const organization = await prisma.organization.findUnique({
        where: { id: req.organizationId }
      });

      if (!organization) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const plan = getPlan(organization.plan);

      // Get current month's usage
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const usage = await prisma.usage.findUnique({
        where: {
          organizationId_month: {
            organizationId: req.organizationId,
            month
          }
        }
      });

      const current = usage ? {
        videosUploaded: usage.videosUploaded,
        minutesProcessed: usage.minutesProcessed,
        storageUsedGB: Number(usage.storageUsed) / (1024 * 1024 * 1024),
        apiCalls: usage.apiCalls
      } : {
        videosUploaded: 0,
        minutesProcessed: 0,
        storageUsedGB: 0,
        apiCalls: 0
      };

      res.json({
        current,
        limits: plan.limits,
        plan: organization.plan,
        month
      });
    } catch (error) {
      console.error('Get usage with limits error:', error);
      res.status(500).json({ error: 'Failed to fetch usage' });
    }
  }
}
