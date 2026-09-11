---
phase: implementation
title: Stellar Launch — Level 4 implementation record
description: Reconciled implementation notes for the evaluation milestone
---

# Stellar Launch — Level 4 implementation record

Date: 2026-09-11  
Feature slug: `stellar-launch`  
Status: implementation in progress

This document is updated after each planned task. It records target-branch
facts only; donor-worktree claims and stale screenshots are not evidence.

## Integration rules

- Preserve `ts/server.ts` launch routes and the existing gateway store.
- Preserve `submitDeposit` staged reservation/contract/activation and indexed
  ticket allocation.
- Reuse the initialized gateway Pool for evaluation Postgres state.
- Keep `EVALUATION_HMAC_SECRET` server-side in web only.
- Never export or send raw wallet/signature/subject/request material.

## Task record

### T1 — domain invariants, memory store, and migration contract (complete)

Added `ts/evaluation.ts` as an isolated domain adapter and
`ts/db/migrations/0009_evaluation.sql` as the ninth migration. The adapter
derives opaque HMAC identities, enforces the exact consent version
`level4-2026-09-11`, verifies canonical SEP-53 Testnet proofs, enforces
challenge expiry/rate limits and unique wallet/deposit ownership, validates
feedback, tracks checkout receipts, purges raw proof material after 90 days,
and exports only redacted evidence after ten unique completed records.

The migration creates the isolated `evaluation` schema and participant,
challenge, and checkout tables with retention, ownership, status, and feedback
constraints. `SCHEMAS` now includes `evaluation`; the original launch schemas
remain unchanged.

Fresh narrow evidence from the target worktree:

- Red: `npm test -- --run evaluation.test.ts` failed because the implementation
  did not exist.
- Green: `npm test -- --run evaluation.test.ts db/migrate.test.ts db/config.test.ts`
  passed (26 tests, 1 opt-in database test skipped).
- `npm run typecheck` passed after building the existing shared package.

The next lifecycle step after T1 was the Postgres adapter using the gateway's
injected pool and migration lifecycle; that task is recorded below.

### T2 — Postgres adapter and gateway lifecycle injection (complete)

Added `PostgresEvaluationStore` with the same contract as the memory adapter,
using a narrow injected `SqlPool`. It maps restricted rows to redacted status,
uses unique database ownership constraints for wallets/deposits/checkouts,
guards one-time challenges with a conditional update, and purges raw proof
columns in place. The target gateway now creates this adapter from the same
Pool used by `PostgresGatewayStore` and `PostgresBillingStore` immediately
after the existing migration runner; test reset restores an injected memory
adapter. No separate evaluation pool or migration lifecycle was introduced.

Fresh evidence:

- `cd ts && npm run typecheck` passed.
- `cd ts && npm test -- --run server.test.ts evaluation-postgres.integration.test.ts evaluation.test.ts db/migrate.test.ts`
  passed (73 tests, 4 opt-in tests skipped without a database).
- With a disposable local Postgres cluster and `RUN_DB_TESTS=1`,
  `npm test -- --run evaluation-postgres.integration.test.ts` passed (3 tests),
  including migration idempotence, cross-instance status durability, proof
  persistence, and concurrent same-session checkout ownership.

T3 is now active: mount the authenticated gateway evaluation router while
keeping the existing launch routes and staged deposit path intact.
