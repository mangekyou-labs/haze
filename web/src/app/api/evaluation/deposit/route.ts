import { NextRequest } from 'next/server';
import { proxyEvaluationRequest } from '@/lib/evaluation-api';
import { invalidEvaluationFields, isRecord, pickFields } from '../evaluation-route';

const DEPOSIT_FIELDS = ['transactionHash', 'newRoot', 'confirmedAt'] as const;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return invalidEvaluationFields();
  }
  if (!isRecord(body)
    || typeof body.transactionHash !== 'string'
    || body.transactionHash.length === 0
    || body.transactionHash.length > 128
    || (body.newRoot !== undefined && (typeof body.newRoot !== 'string' || body.newRoot.length > 256))
    || (body.confirmedAt !== undefined
      && (typeof body.confirmedAt !== 'number' || !Number.isFinite(body.confirmedAt)))) {
    return invalidEvaluationFields();
  }
  return proxyEvaluationRequest(
    '/v1/evaluation/deposit',
    'POST',
    pickFields(body, DEPOSIT_FIELDS),
  );
}
