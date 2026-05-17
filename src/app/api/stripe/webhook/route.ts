/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events for subscription lifecycle:
 *   - checkout.session.completed → Upgrade user to Pro
 *   - customer.subscription.deleted → Downgrade user to Free
 *
 * DESIGN.html §16: Subscription management
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import { audit } from '@/lib/audit';

const logger = createLogger('api/stripe/webhook');

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'your-stripe-secret-key') return null;
  return new Stripe(key, { apiVersion: '2025-06-16.basil' as any });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId || session.client_reference_id;
        const plan = session.metadata?.plan || 'pro';
        if (userId) {
          await db.update(users).set({ plan: plan as 'pro' | 'school', updatedAt: new Date().toISOString() }).where(eq(users.id, userId));
          logger.info(`User upgraded to ${plan}`, { userId });
          await audit({ userId, action: 'subscription.upgrade', resourceType: 'subscription', details: { plan, sessionId: session.id } });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await db.update(users).set({ plan: 'free', updatedAt: new Date().toISOString() }).where(eq(users.id, userId));
          logger.info('User downgraded to Free', { userId });
          await audit({ userId, action: 'subscription.downgrade', resourceType: 'subscription', details: { plan: 'free' } });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        logger.warn('Payment failed', { customerId: invoice.customer as string });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error('Webhook handler failed', { error: err instanceof Error ? err.message : String(err), eventType: event.type });
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}
