import Stripe from 'stripe';
import { PLANS } from '../config/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-09-30.clover'
});

export class StripeService {
  /**
   * Create a Stripe customer
   */
  static async createCustomer(email: string, name: string, organizationId: string): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          organizationId
        }
      });

      return customer.id;
    } catch (error) {
      console.error('Create Stripe customer error:', error);
      throw error;
    }
  }

  /**
   * Create a checkout session for plan subscription
   */
  static async createCheckoutSession(
    customerId: string,
    planId: string,
    organizationId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    try {
      const plan = PLANS[planId];
      
      if (!plan || plan.price === 0) {
        throw new Error('Invalid plan for checkout');
      }

      // Create or get price ID for this plan
      const priceId = await this.getOrCreatePrice(planId);

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          organizationId,
          planId
        }
      });

      return session.url || '';
    } catch (error) {
      console.error('Create checkout session error:', error);
      throw error;
    }
  }

  /**
   * Create or get Stripe price for a plan
   */
  static async getOrCreatePrice(planId: string): Promise<string> {
    try {
      const plan = PLANS[planId];
      
      // In production, you'd store these price IDs in your database or env vars
      // For now, we'll create them dynamically (not recommended for production)
      const prices = await stripe.prices.list({
        lookup_keys: [`plan_${planId}`],
        limit: 1
      });

      if (prices.data.length > 0) {
        return prices.data[0].id;
      }

      // Create product if it doesn't exist
      const products = await stripe.products.list({
        limit: 1,
        active: true
      });

      let productId: string;
      
      if (products.data.length === 0) {
        const product = await stripe.products.create({
          name: 'Video Processor Subscription',
          description: 'Video processing and transcoding service'
        });
        productId = product.id;
      } else {
        productId = products.data[0].id;
      }

      // Create price
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: plan.price * 100, // Convert to cents
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        lookup_key: `plan_${planId}`,
        metadata: {
          planId,
          planName: plan.name
        }
      });

      return price.id;
    } catch (error) {
      console.error('Get or create price error:', error);
      throw error;
    }
  }

  /**
   * Create a billing portal session
   */
  static async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });

      return session.url;
    } catch (error) {
      console.error('Create portal session error:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await stripe.subscriptions.cancel(subscriptionId);
    } catch (error) {
      console.error('Cancel subscription error:', error);
      throw error;
    }
  }

  /**
   * Get subscription details
   */
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      console.error('Get subscription error:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  static constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
