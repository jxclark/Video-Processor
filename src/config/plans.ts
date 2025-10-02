export interface PlanLimits {
  videosPerMonth: number;
  minutesPerMonth: number;
  storageGB: number;
  apiCallsPerMonth: number;
  maxTeamMembers: number;
  maxResolutions: string[];
  supportLevel: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number; // Monthly price in USD
  limits: PlanLimits;
  features: string[];
}

export const PLANS: Record<string, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    limits: {
      videosPerMonth: 10,
      minutesPerMonth: 30,
      storageGB: 5,
      apiCallsPerMonth: 1000,
      maxTeamMembers: 1,
      maxResolutions: ['480p', '720p'],
      supportLevel: 'community'
    },
    features: [
      '10 videos per month',
      '30 minutes of processing',
      '5GB storage',
      '1,000 API calls/month',
      'Solo user only',
      'Up to 720p resolution',
      'Community support'
    ]
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    limits: {
      videosPerMonth: 50,
      minutesPerMonth: 150,
      storageGB: 25,
      apiCallsPerMonth: 10000,
      maxTeamMembers: 3,
      maxResolutions: ['480p', '720p', '1080p'],
      supportLevel: 'email'
    },
    features: [
      '50 videos per month',
      '150 minutes of processing',
      '25GB storage',
      '10,000 API calls/month',
      'Up to 3 team members',
      'Up to 1080p resolution',
      'Email support',
      'Priority processing'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 99,
    limits: {
      videosPerMonth: 200,
      minutesPerMonth: 600,
      storageGB: 100,
      apiCallsPerMonth: 50000,
      maxTeamMembers: 10,
      maxResolutions: ['480p', '720p', '1080p', '4K'],
      supportLevel: 'priority'
    },
    features: [
      '200 videos per month',
      '600 minutes of processing',
      '100GB storage',
      '50,000 API calls/month',
      'Up to 10 team members',
      'Up to 4K resolution',
      'Priority support',
      'Advanced analytics',
      'Custom branding'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    limits: {
      videosPerMonth: -1, // Unlimited
      minutesPerMonth: -1, // Unlimited
      storageGB: 500,
      apiCallsPerMonth: -1, // Unlimited
      maxTeamMembers: -1, // Unlimited
      maxResolutions: ['480p', '720p', '1080p', '4K', '8K'],
      supportLevel: 'dedicated'
    },
    features: [
      'Unlimited videos',
      'Unlimited processing',
      '500GB+ storage',
      'Unlimited API calls',
      'Unlimited team members',
      'Up to 8K resolution',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'Advanced security'
    ]
  }
};

export function getPlan(planId: string): Plan {
  return PLANS[planId] || PLANS.free;
}

export function canUpgrade(currentPlan: string, newPlan: string): boolean {
  const planOrder = ['free', 'starter', 'pro', 'enterprise'];
  const currentIndex = planOrder.indexOf(currentPlan);
  const newIndex = planOrder.indexOf(newPlan);
  return newIndex > currentIndex;
}

export function canDowngrade(currentPlan: string, newPlan: string): boolean {
  const planOrder = ['free', 'starter', 'pro', 'enterprise'];
  const currentIndex = planOrder.indexOf(currentPlan);
  const newIndex = planOrder.indexOf(newPlan);
  return newIndex < currentIndex;
}

export function checkLimit(usage: number, limit: number): boolean {
  if (limit === -1) return true; // Unlimited
  return usage < limit;
}
