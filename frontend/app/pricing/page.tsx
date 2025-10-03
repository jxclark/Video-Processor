'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Zap } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface PlanLimits {
  videosPerMonth: number;
  minutesPerMonth: number;
  storageGB: number;
  apiCallsPerMonth: number;
  maxTeamMembers: number;
  maxResolutions: string[];
  supportLevel: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  limits: PlanLimits;
  features: string[];
}

export default function PricingPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);

  useEffect(() => {
    fetchPlans();
    if (user) {
      fetchCurrentPlan();
    }

    // Check for success/cancel params
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      alert('Payment successful! Your plan has been updated.');
      router.replace('/pricing');
    } else if (params.get('canceled') === 'true') {
      alert('Payment canceled. You can try again anytime.');
      router.replace('/pricing');
    }
  }, [user]);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/billing/plans`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setPlans(response.data.plans);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPlan = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/billing/current-plan`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentPlan(response.data.currentPlan);
      setHasSubscription(response.data.plan.price > 0);
    } catch (error) {
      console.error('Error fetching current plan:', error);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/api/billing/create-portal`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.href = response.data.url;
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to open billing portal');
    }
  };

  const handleChangePlan = async (planId: string) => {
    if (!user) {
      router.push('/signup');
      return;
    }

    if (planId === currentPlan) return;

    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    setChangingPlan(planId);
    try {
      // For paid plans, use Stripe checkout
      if (plan.price > 0) {
        const response = await axios.post(
          `${API_URL}/api/billing/create-checkout`,
          { planId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // Redirect to Stripe checkout
        window.location.href = response.data.url;
      } else {
        // For free plan, downgrade directly
        await axios.post(
          `${API_URL}/api/billing/change-plan`,
          { newPlan: planId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        alert('Downgraded to Free plan successfully!');
        setCurrentPlan(planId);
        setChangingPlan(null);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to change plan');
      setChangingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-xl text-gray-600">
          Choose the plan that's right for you
        </p>
        {user && hasSubscription && (
          <div className="mt-6">
            <button
              onClick={handleManageBilling}
              className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Manage Billing & Invoices
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isPopular = plan.id === 'pro';

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 ${
                isPopular
                  ? 'border-primary-600 shadow-xl'
                  : 'border-gray-200'
              } bg-white p-8`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-4 py-1 text-sm font-semibold text-white">
                    <Zap className="w-4 h-4" />
                    Popular
                  </span>
                </div>
              )}

              {isCurrent && (
                <div className="absolute -top-4 right-4">
                  <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-5xl font-extrabold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="ml-2 text-gray-600">/month</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleChangePlan(plan.id)}
                disabled={isCurrent || changingPlan === plan.id}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isPopular
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-50`}
              >
                {changingPlan === plan.id
                  ? 'Changing...'
                  : isCurrent
                  ? 'Current Plan'
                  : user
                  ? 'Change Plan'
                  : 'Get Started'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-16 text-center">
        <p className="text-gray-600">
          All plans include our core features. Need something custom?{' '}
          <a href="mailto:support@videoprocessor.com" className="text-primary-600 hover:text-primary-500 font-medium">
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
