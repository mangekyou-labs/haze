import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { Pool } from 'pg';
import { runMigrations } from './db/migrate.js';
import {
  EVALUATION_CONSENT_VERSION,
  buildSep53PayloadDigest,
  deriveParticipantIdentity,
} from './evaluation.js';
import { PostgresEvaluationStore } from './evaluation-postgres.js';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/zk_credits_test';
const MIGRATIONS_DIR = new URL('./db/migrations', import.meta.url).pathname;
const dbTestsEnabled = process.env.RUN_DB_TESTS === '1';

describe.skipIf(!dbTestsEnabled)('PostgresEvaluationStore (integration, requires disposable Postgres)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DATABASE_URL });
    await pool.query('DROP SCHEMA IF EXISTS evaluation CASCADE');
    await pool.query('CREATE TABLE IF NOT EXISTS public.schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    await pool.query("DELETE FROM public.schema_migrations WHERE filename = '0009_evaluation.sql'");
  });

  afterAll(async () => {
    await pool.end();
  });

  it('runs migration 0009 once and makes the second run a no-op', async () => {
    const first = await runMigrations(pool, MIGRATIONS_DIR);
    expect(first.applied).toContain('0009_evaluation.sql');

    const second = await runMigrations(pool, MIGRATIONS_DIR);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toContain('0009_evaluation.sql');
  });

  it('persists proofs and status across store instances', async () => {
    const participant = deriveParticipantIdentity('postgres-evaluation-subject', 'secret');
    const store1 = new PostgresEvaluationStore(pool, { id: () => 'challenge-postgres-1' });
    const store2 = new PostgresEvaluationStore(pool);
    await store1.enroll(participant.fullId, EVALUATION_CONSENT_VERSION);
    const challenge = await store1.createChallenge(participant.fullId);
    const keypair = Keypair.random();
    const signature = keypair.sign(buildSep53PayloadDigest(challenge.message)).toString('base64');

    await expect(store2.verifyWallet(participant.fullId, {
      challengeId: challenge.id,
      address: keypair.publicKey(),
      signature,
      network: 'testnet',
    })).resolves.toMatchObject({ verified: true });
    await expect(store2.linkDeposit(participant.fullId, 'b'.repeat(64)))
      .resolves.toMatchObject({ deposit: { confirmed: true, transactionHash: 'b'.repeat(64) } });
    await expect(store2.submitFeedback(participant.fullId, {
      easeRating: 4,
      taskCompleted: true,
      wouldUseAgain: true,
      mostValuableAspect: 'durable state',
      biggestFriction: 'none',
      quoteConsent: false,
    })).resolves.toMatchObject({ complete: true });

    await expect(store1.getStatus(participant.fullId)).resolves.toMatchObject({
      wallet: { verified: true },
      deposit: { transactionHash: 'b'.repeat(64) },
      feedbackSubmitted: true,
      complete: true,
    });
  });

  it('makes concurrent same-session checkout inserts ownership-safe', async () => {
    const participant = deriveParticipantIdentity('postgres-checkout-subject', 'secret');
    const other = deriveParticipantIdentity('postgres-checkout-other', 'secret');
    const store1 = new PostgresEvaluationStore(pool);
    const store2 = new PostgresEvaluationStore(pool);
    await store1.enroll(participant.fullId, EVALUATION_CONSENT_VERSION);
    await store1.enroll(other.fullId, EVALUATION_CONSENT_VERSION);

    const results = await Promise.all([
      store1.recordCheckout(participant.fullId, {
        checkoutSessionId: 'cs_postgres_concurrent',
        amountCents: 100,
        eventId: 'evt_postgres_1',
      }),
      store2.recordCheckout(participant.fullId, {
        checkoutSessionId: 'cs_postgres_concurrent',
        amountCents: 100,
        eventId: 'evt_postgres_2',
      }),
    ]);
    expect(results[0]).toMatchObject({ checkoutSessionId: 'cs_postgres_concurrent', amountCents: 100 });
    expect(results[1]).toEqual(results[0]);
    await expect(store1.recordCheckout(other.fullId, {
      checkoutSessionId: 'cs_postgres_concurrent',
      amountCents: 100,
    })).rejects.toMatchObject({ code: 'checkout_already_used' });
  });
});
