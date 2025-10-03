import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { PLANS } from '../config/plans';

// Store for tracking rate limits per organization
const organizationLimits = new Map<string, { count: number; resetTime: number }>();

/**
 * Get rate limit based on organization's plan
 */
export const getRateLimitForPlan = (plan: string) => {
  const planConfig = PLANS[plan] || PLANS.free;
  return planConfig.limits.apiCallsPerMonth;
};

/**
 * Custom rate limiter that considers organization plan
 */
export const organizationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: async (req: Request) => {
    // Get organization from request (set by auth middleware)
    const organizationId = req.organizationId;
    
    if (!organizationId) {
      return 10; // Default for unauthenticated requests
    }

    // Get organization's plan from database
    const prisma = require('../config/database').default;
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true }
    });

    if (!organization) {
      return 10;
    }

    // Rate limits per minute based on plan
    const limits: Record<string, number> = {
      free: 10,      // 10 requests per minute
      starter: 30,   // 30 requests per minute
      pro: 100,      // 100 requests per minute
      enterprise: 500 // 500 requests per minute
    };

    return limits[organization.plan] || 10;
  },
  message: {
    error: 'Too many requests from this organization. Please try again later.',
    retryAfter: 60
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Use organization ID as key
  keyGenerator: (req: Request) => {
    return req.organizationId || req.ip || 'anonymous';
  },
  // Skip rate limiting for certain routes
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit for your plan. Please upgrade or try again later.',
      retryAfter: 60
    });
  }
});

/**
 * API-specific rate limiter (stricter)
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: async (req: Request) => {
    const organizationId = req.organizationId;
    
    if (!organizationId) {
      return 5; // Very strict for unauthenticated
    }

    const prisma = require('../config/database').default;
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true }
    });

    if (!organization) {
      return 5;
    }

    // Stricter limits for API endpoints
    const limits: Record<string, number> = {
      free: 5,
      starter: 15,
      pro: 50,
      enterprise: 200
    };

    return limits[organization.plan] || 5;
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.organizationId || req.ip || 'anonymous',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'API rate limit exceeded',
      message: 'You have exceeded the API rate limit for your plan. Please upgrade for higher limits.',
      retryAfter: 60
    });
  }
});

/**
 * Auth rate limiter (prevent brute force)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    error: 'Too many login attempts. Please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use IP + email for login attempts
    const email = req.body.email || '';
    return `${req.ip}-${email}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.',
      retryAfter: 900
    });
  }
});

/**
 * Upload rate limiter (prevent abuse of file uploads)
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: async (req: Request) => {
    const organizationId = req.organizationId;
    
    if (!organizationId) {
      return 1; // Very strict for unauthenticated
    }

    const prisma = require('../config/database').default;
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true }
    });

    if (!organization) {
      return 1;
    }

    // Upload limits per minute
    const limits: Record<string, number> = {
      free: 2,       // 2 uploads per minute
      starter: 5,    // 5 uploads per minute
      pro: 10,       // 10 uploads per minute
      enterprise: 20 // 20 uploads per minute
    };

    return limits[organization.plan] || 1;
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.organizationId || req.ip || 'anonymous',
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Upload rate limit exceeded',
      message: 'You have exceeded the upload rate limit for your plan. Please wait before uploading more files.',
      retryAfter: 60
    });
  }
});
