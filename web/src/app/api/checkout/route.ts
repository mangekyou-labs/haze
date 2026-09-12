import { auth } from '@/auth';
import {
  EVALUATION_CHECKOUT_AMOUNT_CENTS,
  buildEvaluationCheckoutMetadata,
} from '@/lib/evaluation-checkout';
import {
  EVALUATION_CONSENT_VERSION,
  EvaluationApiError,
  evaluationGatewayRequest,
  getEvaluationIdentity,
  isEvaluationCommitment,
} from '@/lib/evaluation-api';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

const PRICE_MAP: Record<string, { usdc: number; label: string }> = {
  evaluation: { usdc: 10_000_000, label: '$1 Evaluation (Stripe test mode)' },
  starter: { usdc: 1_000_000, label: '$1 Starter (100 tickets)' },
  pro: { usdc: 20_000_000, label: '$20 Credits' },
  enterprise: { usdc: 50_000_000, label: '$50 Credits' },
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 500 });
  }

  const stripe = getStripe()!;

  let tier: string;
  let commitment: string | undefined;
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }
    tier = typeof body.tier === 'string' ? body.tier : '';
    commitment = typeof body.commitment === 'string' ? body.commitment : undefined;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const priceInfo = PRICE_MAP[tier];
  if (!priceInfo || !['starter', 'evaluation'].includes(tier)) {
    return NextResponse.json(
      { error: 'invalid_tier', valid: ['starter', 'evaluation'] },
      { status: 400 },
    );
  }

  const origin = req.nextUrl.origin || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  let evaluationMetadata: Record<string, string> | undefined;
  if (tier === 'evaluation') {
    if (!isEvaluationCommitment(commitment)) {
      return NextResponse.json({ error: 'commitment_required' }, { status: 400 });
    }
    if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
      return NextResponse.json({ error: 'evaluation_requires_stripe_test_mode' }, { status: 400 });
    }
    try {
      const identity = await getEvaluationIdentity();
      if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      const statusResponse = await evaluationGatewayRequest('/v1/evaluation/status', 'GET');
      if (!statusResponse.ok) {
        return NextResponse.json({ error: 'enrollment_required' }, { status: 409 });
      }
      const status = await statusResponse.json() as { consentVersion?: string };
      if (status.consentVersion !== EVALUATION_CONSENT_VERSION) {
        return NextResponse.json({ error: 'enrollment_required' }, { status: 409 });
      }
      evaluationMetadata = buildEvaluationCheckoutMetadata({
        participantId: identity.fullId,
        participantCode: identity.publicCode,
        commitment,
      });
    } catch (error) {
      if (error instanceof EvaluationApiError) {
        return NextResponse.json({ error: error.code }, { status: error.status });
      }
      return NextResponse.json({ error: 'evaluation_unavailable' }, { status: 503 });
    }
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: priceInfo.label,
              description: `ZK-API Credits — ${priceInfo.label}`,
            },
            unit_amount: tier === 'evaluation'
              ? EVALUATION_CHECKOUT_AMOUNT_CENTS
              : tier === 'starter' ? 100 : tier === 'pro' ? 2000 : 5000,
          },
          quantity: 1,
        },
      ],
      success_url: tier === 'evaluation'
        ? `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`
        : `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard?checkout=cancelled`,
      metadata: evaluationMetadata ?? {
        userId: session.user.id,
        tier,
        usdcAmount: priceInfo.usdc.toString(),
        ...(commitment ? { commitment } : {}),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch {
    console.error('Stripe checkout request failed');
    return NextResponse.json({ error: 'stripe_error' }, { status: 500 });
  }
}
