import { Request, Response } from 'express';
import { UsageService } from '../services/usage.service';

export class UsageController {
  // Get usage statistics for authenticated organization
  static async getUsageStats(req: Request, res: Response): Promise<void> {
    try {
      if (!req.organizationId) {
        res.status(401).json({ error: 'Organization not authenticated' });
        return;
      }

      const stats = await UsageService.getUsageStats(req.organizationId);
      res.json(stats);
    } catch (error) {
      console.error('Get usage stats error:', error);
      res.status(500).json({ error: 'Failed to fetch usage statistics' });
    }
  }
}
