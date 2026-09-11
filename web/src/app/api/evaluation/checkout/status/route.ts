import { NextRequest } from 'next/server';
import { proxyEvaluationRequest } from '@/lib/evaluation-api';
import { invalidEvaluationFields, isRecord, pickFields } from '../../evaluation-route';

const CHECKOUT_STATUS_FIELDS = ['checkoutSessionId', 'status', 'transactionHash', 'newRoot'] as const;

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
    || typeof body.status !== 'string'
    || !['pending', 'processing', 'confirmed', 'failed'].includes(body.status)
    || (body.transactionHash !== undefined && typeof body.transactionHash !== 'string')
    || (body.newRoot !== undefined && typeof body.newRoot !== 'string')) {
    return invalidEvaluationFields();
  }
  return proxyEvaluationRequest(
    '/v1/evaluation/checkout/status',
    'POST',
    pickFields(body, CHECKOUT_STATUS_FIELDS),
  );
}
