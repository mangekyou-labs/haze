import { NextRequest } from 'next/server';
import { proxyEvaluationRequest } from '@/lib/evaluation-api';
import { invalidEvaluationFields, isRecord, pickFields } from '../evaluation-route';

const CHECKOUT_FIELDS = ['checkoutSessionId', 'amountCents', 'eventId'] as const;

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId || sessionId.length > 256) return invalidEvaluationFields();
  return proxyEvaluationRequest(
    `/v1/evaluation/checkout?sessionId=${encodeURIComponent(sessionId)}`,
    'GET',
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return invalidEvaluationFields();
  }
  if (!isRecord(body)
    || typeof body.checkoutSessionId !== 'string'
    || body.checkoutSessionId.length === 0
    || body.checkoutSessionId.length > 256
    || typeof body.amountCents !== 'number'
    || !Number.isInteger(body.amountCents)
    || (body.eventId !== undefined && typeof body.eventId !== 'string')) {
    return invalidEvaluationFields();
  }
  return proxyEvaluationRequest(
    '/v1/evaluation/checkout',
    'POST',
    pickFields(body, CHECKOUT_FIELDS),
  );
}
