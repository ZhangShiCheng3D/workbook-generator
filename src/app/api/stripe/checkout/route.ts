/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for Pro subscription ($8/month).
 * Redirects the user to Stripe's hosted checkout page.
 *
 * DESIGN.html §16: Subscription pricing — Stripe Checkout integration
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/auth/supabase';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { apiError, ErrorCode } from '@/lib/api-response';
import { isSupabaseConfigured, APP_ORIGIN } from '@/lib/env';
import { applySecurityHeaders } from '@/lib/security';
import { createLogger } from '@/lib/logger';
import { audit } from '@/lib/audit';

const logger = createLogger('api/stripe/checkout');

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'your-stripe-secret-key') return null;
  return new Stripe(key, { apiVersion: '2025-06-16.basil' as any });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const stripe = getStripe();
  if (!stripe) {
    return apiError(ErrorCode.SERVICE_UNAVAILABLE, 'Stripe is not configured.', 503);
  }

  // ---- Auth ----
  let userId: string | null = null;
  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch (err) {
      logger.error('Auth error', { error: err instanceof Error ? err.message : String(err) });
      return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required.', 401);
    }
  }
  if (!userId) {
    return apiError(ErrorCode.UNAUTHORIZED, 'Authentication required.', 401);
  }

  // ---- Get user email ----
  const userRow = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const email = userRow[0]?.email ?? `user-${userId.substring(0, 8)}@practicepacks.com`;

  // ---- Determine plan from query param ----
  const { searchParams } = new URL(request.url);
  const planParam = searchParams.get('plan') || 'pro';

  const planConfig: Record<string, { name: string; description: string; amount: number; seats?: number }> = {
    pro: { name: 'Practice Packs Pro', description: 'Unlimited workbooks · Premium PDF · No watermarks', amount: 800 },
    school: { name: 'Practice Packs School', description: '10 teacher seats · Admin dashboard · School Library · Priority support', amount: 9900 },
  };

  const selectedPlan = planConfig[planParam] ?? planConfig.pro;

  // ---- Create checkout session ----
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPlan.name,
              description: selectedPlan.description,
            },
            recurring: { interval: 'month' },
            unit_amount: selectedPlan.amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_ORIGIN}/dashboard?checkout=success`,
      cancel_url: `${APP_ORIGIN}/dashboard/settings?checkout=cancelled`,
      metadata: { userId, plan: planParam },
    });

    await audit({
      userId,
      action: 'stripe.checkout.create',
      resourceType: 'subscription',
      resourceId: session.id,
    });

    const response = NextResponse.json({ url: session.url });
    applySecurityHeaders(response, { appOrigin: APP_ORIGIN });
    return response;
  } catch (err) {
    logger.error('Stripe checkout creation failed', {
      error: err instanceof Error ? err.message : String(err),
      userId,
    });
    return apiError(ErrorCode.INTERNAL_ERROR, 'Failed to create checkout session.', 500);
  }
}
