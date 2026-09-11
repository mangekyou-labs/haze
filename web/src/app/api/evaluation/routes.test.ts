import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  proxy: vi.fn(async (_path: string, _method: string, body?: unknown) =>
    new Response(JSON.stringify({ ok: true, body }), { status: 200 })),
}));

vi.mock('@/lib/evaluation-api', () => ({
  EVALUATION_CONSENT_VERSION: 'level4-2026-09-11',
  proxyEvaluationRequest: mocks.proxy,
}));

import { NextRequest } from 'next/server';
import { POST as enroll } from './enroll/route';
import { GET as status } from './status/route';
import { POST as walletProof } from './wallet-proof/route';
import { POST as checkoutPost, GET as checkoutGet } from './checkout/route';

describe('evaluation web proxy routes', () => {
  it('requires the exact consent version before forwarding enrollment', async () => {
    mocks.proxy.mockClear();

    const oldConsent = await enroll(new NextRequest('http://localhost/api/evaluation/enroll', {
      method: 'POST',
      body: JSON.stringify({ consentVersion: 'level4-2026-09-10' }),
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(oldConsent.status).toBe(400);
    expect(mocks.proxy).not.toHaveBeenCalled();

    const accepted = await enroll(new NextRequest('http://localhost/api/evaluation/enroll', {
      method: 'POST',
      body: JSON.stringify({ consentVersion: 'level4-2026-09-11', extra: 'ignored' }),
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(accepted.status).toBe(200);
    expect(mocks.proxy).toHaveBeenLastCalledWith(
      '/v1/evaluation/enroll',
      'POST',
      { consentVersion: 'level4-2026-09-11' },
    );
  });

  it('forwards only the wallet proof allowlist', async () => {
    mocks.proxy.mockClear();
    const response = await walletProof(new NextRequest('http://localhost/api/evaluation/wallet-proof', {
      method: 'POST',
      body: JSON.stringify({
        challengeId: 'challenge-1',
        address: 'GABC',
        signature: 'signature',
        network: 'testnet',
        message: 'message',
        secret: 'must-not-forward',
      }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(mocks.proxy).toHaveBeenLastCalledWith(
      '/v1/evaluation/wallet-proof',
      'POST',
      {
        challengeId: 'challenge-1',
        address: 'GABC',
        signature: 'signature',
        network: 'testnet',
        message: 'message',
      },
    );
  });

  it('keeps checkout ownership in the query/body contract', async () => {
    mocks.proxy.mockClear();
    await checkoutGet(new NextRequest(
      'http://localhost/api/evaluation/checkout?sessionId=cs_test%2F1',
    ));
    expect(mocks.proxy).toHaveBeenLastCalledWith(
      '/v1/evaluation/checkout?sessionId=cs_test%2F1',
      'GET',
    );

    await checkoutPost(new NextRequest('http://localhost/api/evaluation/checkout', {
      method: 'POST',
      body: JSON.stringify({
        checkoutSessionId: 'cs_test',
        amountCents: 100,
        eventId: 'evt_test',
        participantId: 'must-not-forward',
      }),
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(mocks.proxy).toHaveBeenLastCalledWith(
      '/v1/evaluation/checkout',
      'POST',
      { checkoutSessionId: 'cs_test', amountCents: 100, eventId: 'evt_test' },
    );
  });

  it('proxies status reads without accepting client identity', async () => {
    mocks.proxy.mockClear();
    await status();
    expect(mocks.proxy).toHaveBeenCalledWith('/v1/evaluation/status', 'GET');
  });
});
