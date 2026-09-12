---
phase: implementation
title: Stellar Launch — Level 4 implementation record
description: Reconciled implementation notes for the evaluation milestone
---

# Stellar Launch — Level 4 implementation record

Date: 2026-09-12
Feature slug: `stellar-launch`  
Status: local implementation and verification complete; hosted acceptance pending

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

### T3 — authenticated gateway evaluation router (complete)

Mounted the evaluation endpoints alongside the existing launch routes in
`ts/server.ts`. Every evaluation request now requires the gateway bearer
secret and an opaque 64-hex participant identifier. Enrollment enforces the
exact consent version; status responses remain pseudonymous; challenge,
canonical SEP-53 proof, feedback, deposit-link, and checkout receipt handlers
delegate to the injected evaluation store. Validation and domain errors are
returned as stable public error codes without raw signatures, messages,
wallet addresses, subjects, or other proof material. The existing
`/v1/deposits` handler and staged `submitDeposit` path were not changed.

Fresh evidence:

- Red: `cd ts && npm test -- --run evaluation-routes.test.ts` initially
  failed because all evaluation routes were absent (404).
- Green: `cd ts && npm test -- --run evaluation-routes.test.ts server.test.ts`
  passed (57 tests).
- `cd ts && npm run typecheck` passed.

### T4 — checkout claims and retryable billing integration (complete)

Extended the evaluation receipt contract with an atomic processing claim and a
five-minute recovery lease. Memory and Postgres stores now allow only one
worker to submit a checkout at a time, record attempt state, and reclaim a
failed or expired processing receipt. The Postgres adapter uses a conditional
`UPDATE` so concurrent workers cannot both claim the same session.

The billing webhook now distinguishes payload conflicts from processed
duplicates, resumes failed/unprocessed events, and routes evaluation deposits
through the existing `submitDeposit` staged reservation, indexed-ticket, and
activation path. A confirmed receipt is the durable chain-result anchor, so a
retry can repair participant linkage without submitting a second deposit.
Launch-era `/v1/deposits` and checkout behavior remains intact.

Fresh evidence:

- `cd ts && npm test -- --run evaluation.test.ts server.test.ts` passed (67
  tests), covering atomic memory claims, failed retry, duplicate
  acknowledgement, retryable webhook failure, and concurrent evaluation
  webhook handling.
- `RUN_DB_TESTS=1 TEST_DATABASE_URL=postgres://localhost:55432/postgres npm test -- --run evaluation-postgres.integration.test.ts`
  passed (4 tests) against a disposable local Postgres cluster, including
  migration idempotence, cross-instance durability, ownership-safe insertion,
  and one-claim/reclaim behavior. The run caught and fixed an explicit
  PostgreSQL `timestamptz` cast issue in the retry update.
- `cd ts && npm run typecheck` passed.

The next task adds the web relay and consent-gated evaluation checkout/status
experience while preserving launch onboarding and checkout.

### T5 — web proxies, checkout, and receipt ownership (complete)

Added server-only web evaluation transport and identity helpers. The proxy
derives the HMAC participant ID from the authenticated session, sends it only
as `x-evaluation-participant-id` with `GATEWAY_SECRET`, uses bounded upstream
timeouts, and exposes allowlisted routes for enrollment, status, challenge,
wallet proof, feedback, deposits, checkout, and checkout status. The receipt
route verifies the Stripe session's evaluation participant metadata before
reading the participant-scoped gateway receipt.

Extended the existing checkout API with a separate consent/enrollment-gated
evaluation tier. It creates an exact 100-cent Stripe test-mode session with
opaque participant metadata and the browser-held decimal commitment; the
launch starter path keeps its existing one-dollar metadata and deposit amount.
The Stripe webhook now uses a filtered relay builder: evaluation events carry
session ownership and amount cents to the gateway's durable claim path, while
legacy events retain the launch billing payload and no evaluation header.

Fresh evidence from the target worktree:

- Red: new web identity, transport, relay, checkout, receipt, and route tests
  initially failed to resolve their not-yet-created production modules.
- Green: focused web proxy/checkout/receipt/relay/identity tests passed (19
  tests).
- `cd web && npm run typecheck` passed after regenerating the target web
  install from its own manifest and lockfile.

T6 is now active: add the dashboard evaluation flow, consented analytics, and
recursive Sentry scrubbing without moving evaluation secrets into browser
code.

### T6 — dashboard evaluation flow and privacy telemetry (complete)

Added an additive client-only evaluation card to the existing dashboard. It
keeps launch onboarding, browser-held identity generation, indexed ticket
status, agent configuration, playground, and Starter checkout in place while
adding a four-stage progress view for consent, wallet proof, payment, and
feedback. Enrollment is gated by the exact consent version and explicitly
describes restricted 90-day retention. Freighter proof requests require the
Testnet network, display only a redacted wallet, and never render a signature
or raw transaction hash. The `$1` evaluation checkout is disabled until
enrollment, wallet verification, and a browser-held commitment are all present;
receipt reconciliation uses bounded polling and exposes only status plus a
safe explorer link.

Added opt-in-only PostHog tracking with an explicit event/property allowlist,
memory persistence, no autocapture/pageviews/session recording, public-code
identification, logout reset, and recursive sensitive-field filtering. Added
browser Sentry instrumentation for client, server, and edge runtimes with
`sendDefaultPii: false`, no traces/breadcrumbs, and the same recursive scrubber.
The target web manifest and lockfile were regenerated with `posthog-js` and
`@sentry/nextjs`; no donor lockfile was copied.

Fresh evidence:

- Red: focused analytics and scrub tests initially failed to resolve their
  not-yet-created production modules.
- Green: `cd web && npm test -- --run src/lib/analytics.test.ts src/lib/sentry-scrub.test.ts src/components/analytics-session-reset.test.ts src/app/api/evaluation/analytics/route.test.ts src/app/api/evaluation/routes.test.ts`
  passed (5 files, 13 tests).
- `cd web && npm run typecheck` passed.
- `cd web && npm run lint` passed with zero errors; six pre-existing warnings
  remain outside this task's new code.
- `cd web && npm run build` passed with the target Sentry instrumentation.
- `cd web && npm run test:e2e -- e2e/level4.spec.ts` passed (1 test), covering
  consent gating, mocked Freighter Testnet proof, commitment gating, `$1`
  checkout, and receipt confirmation.

### T7 — service telemetry, retention operations, and synthetic monitoring (complete)

Added the same recursive, depth-bounded Sentry scrubber and PII-disabled
initialization to the gateway and fee-sponsor service. Both services accept
only their own `SENTRY_DSN` configuration; the gateway still receives no
`EVALUATION_HMAC_SECRET`. Added a dedicated-secret
`POST /v1/internal/evaluation/purge` endpoint plus a non-overlapping daily
Postgres-backed scheduler. The route returns only an anonymized count and
logs only a count or safe error class.

Added `scripts/level4-synthetic.mjs` and focused Node tests. It requires the
exact `LEVEL4_FRONTEND_URL`, `LEVEL4_GATEWAY_URL`, and
`LEVEL4_FEE_SPONSOR_URL` variables, probes four health/readiness paths,
retries transient failures within bounded limits, labels three sequential
passes `cold`, `warm`, `warm`, and never prints URLs or response bodies. The
scheduled/manual `.github/workflows/deploy-smoke.yml` job now runs this
monitor, and the Level 4 branch is included in the normal CI push trigger.
Target service manifests and lockfiles were regenerated independently.

Fresh evidence:

- `cd ts && npm test -- --run telemetry/sentry.test.ts telemetry/sentry-scrub.test.ts`
  passed (4 tests).
- `cd ts && npm test -- --run evaluation-routes.test.ts` passed (7 tests),
  including the dedicated purge route and bounded non-overlapping scheduler.
- `cd services/fee-sponsor && npm test` passed (1 test) and
  `npm run typecheck` passed.
- `node --test scripts/level4-synthetic.test.mjs && node --check scripts/level4-synthetic.mjs`
  passed (3 tests).
- Web analytics regression tests passed after ensuring stale opt-in state
  cannot capture before initialization and a submitted survey emits once.

### T8 — final verification and lifecycle reconciliation (complete locally)

The clean Level 4 worktree passed the final cross-package verification matrix:

- Gateway typecheck and full tests: 22 files, 196 tests passed, 16 skipped;
  disposable Postgres migration/persistence/ownership/claim suite: 5 passed.
- Web tests: 20 files, 60 tests; typecheck, lint (zero errors), production
  build, and all 17 Playwright E2E tests passed.
- Shared package (23 tests), sidecar (64 tests plus pack dry-run), fee sponsor
  typecheck/tests, circuit suite, synthetic monitor, and Soroban `cargo +1.94`
  suite (24 tests) passed.

The final requirement audit confirms the exact consent and identity boundary,
isolated migration/persistence, SEP-53/retention/ownership invariants,
consent-gated billing retry behavior, telemetry privacy controls, synthetic CI
wiring, and unchanged launch-era staged deposit/indexed-ticket behavior.
`git diff --check` passed. Hosted deployment, cohort, fresh screenshots/video,
telemetry exports, and GitHub publication remain external acceptance gates
until their credentials and direct evidence exist.
