---
phase: testing
title: Stellar Launch — Level 4 verification record
description: Fresh verification evidence for the additive evaluation milestone
---

# Stellar Launch — Level 4 verification record

Date: 2026-09-12
Feature slug: `stellar-launch`  
Status: local verification complete; hosted evidence pending

Only commands run in the clean Level 4 worktree may be recorded here. Donor
claims, development screenshots, and stale lockfile results are excluded.

## Local command matrix

| Area | Command | Result |
|---|---|---|
| AI DevKit lint | `npx ai-devkit@latest lint --feature stellar-launch` | unavailable: this environment's CLI reported `unknown command` |
| Gateway typecheck/tests | `cd ts && npm run typecheck && npm test` | pass (22 files; 196 tests passed, 16 skipped) |
| Disposable Postgres | `RUN_DB_TESTS=1 TEST_DATABASE_URL=postgres://localhost:55432/postgres npm test -- --run evaluation-postgres.integration.test.ts` | pass (5 tests; migration twice, persistence, concurrent ownership, claim/reclaim) |
| Web tests | `cd web && npm test` | pass (20 files; 60 tests) |
| Web typecheck/lint/build | `cd web && npm run typecheck && npm run lint && npm run build` | pass; lint 0 errors and 6 existing warnings; build pass |
| Web E2E | `cd web && npm run test:e2e` | pass (17 tests) |
| Shared package | `cd packages/zk-credits-shared && npm ci && npm run build && npm test` | pass (build; 23 tests) |
| Sidecar package | `cd packages/zk-credits-sidecar && npm ci && npm run build && npm test && npm pack --dry-run` | pass (build; 64 tests; pack dry-run) |
| Fee sponsor | `cd services/fee-sponsor && npm run typecheck && npm test` | pass (typecheck; 1 test) |
| Circuits | `cd circuits && npm ci && node scripts/test.js` | pass (circuit, RLN, withdrawal, and slash suites) |
| Soroban contract | `cd zk-credits-contract && cargo +1.94 test` | pass (24 tests; existing warnings only) |
| Synthetic monitor | `node --test scripts/level4-synthetic.test.mjs`; `node --check scripts/level4-synthetic.mjs` | pass (3 tests) |
| Whitespace | `git diff --check` | pass |

## T1 narrow evidence

| Behavior | Command | Result |
|---|---|---|
| Identity, consent, SEP-53, expiry/replay, rate limits, ownership, feedback, retention, checkout, redacted evidence | `cd ts && npm test -- --run evaluation.test.ts` | pass (13 tests) |
| Migration ordering/isolation and schema registry | `cd ts && npm test -- --run db/migrate.test.ts db/config.test.ts` | pass (14 tests; 1 opt-in database test skipped) |

The failing-first evidence for T1 is recorded in the implementation document;
the initial run failed to resolve `./evaluation.js` before the adapter was
implemented. No external deployment or cohort evidence is claimed.

## T2 narrow evidence

| Behavior | Command | Result |
|---|---|---|
| Postgres migration twice, restart durability, and concurrent checkout/participant ownership | `RUN_DB_TESTS=1 TEST_DATABASE_URL=postgres://localhost:55432/postgres npm test -- --run evaluation-postgres.integration.test.ts` | pass (5 tests, disposable local cluster) |
| Gateway lifecycle injection and evaluation adapter compile | `npm run typecheck` | pass |

## T3 narrow evidence

| Authenticated route boundary, consent/status redaction, proof replay, validation, feedback ordering, deposit linking, checkout ownership | `cd ts && npm test -- --run evaluation-routes.test.ts server.test.ts` | pass (57 tests) |
| Gateway route type safety | `cd ts && npm run typecheck` | pass |

## T4 narrow evidence

| Behavior | Command | Result |
|---|---|---|
| Atomic memory checkout claims, failed-claim recovery, duplicate acknowledgement, retryable webhook failure, and concurrent evaluation webhook handling | `cd ts && npm test -- --run evaluation.test.ts server.test.ts` | pass (67 tests) |
| Postgres migration twice, restart durability, ownership-safe insertion, and concurrent claim/reclaim | `RUN_DB_TESTS=1 TEST_DATABASE_URL=postgres://localhost:55432/postgres npm test -- --run evaluation-postgres.integration.test.ts` | pass (4 tests, disposable local cluster) |
| Gateway adapter and billing integration type safety | `cd ts && npm run typecheck` | pass |

## T5 narrow evidence

| Web participant identity, consent version, and commitment validation | `cd web && npm test -- --run src/lib/evaluation-identity.test.ts src/lib/evaluation-checkout.test.ts` | pass (4 tests) |
| Authenticated proxy field allowlists and gateway transport headers | `cd web && npm test -- --run src/lib/evaluation-transport.test.ts src/app/api/evaluation/routes.test.ts` | pass (6 tests) |
| Consent-gated evaluation checkout and launch starter regression | `cd web && npm test -- --run src/app/api/checkout/route.test.ts` | pass (3 tests) |
| Filtered Stripe relay payloads and receipt ownership | `cd web && npm test -- --run src/lib/stripe-relay.test.ts src/lib/evaluation-receipt.test.ts src/app/api/checkout/receipt/route.test.ts` | pass (6 tests) |
| Web route type safety | `cd web && npm run typecheck` | pass |

## T6 narrow evidence

| Behavior | Command | Result |
|---|---|---|
| Opt-in-only PostHog initialization, event/property allowlist, duration clamping, and logout reset | `cd web && npm test -- --run src/lib/analytics.test.ts src/components/analytics-session-reset.test.ts` | pass (5 tests; the standalone analytics regression below adds 6 current assertions) |
| Recursive browser Sentry scrub, including nested arrays and bounded depth | `cd web && npm test -- --run src/lib/sentry-scrub.test.ts` | pass (2 tests) |
| Explicit analytics opt-in route and evaluation route regression | `cd web && npm test -- --run src/app/api/evaluation/analytics/route.test.ts src/app/api/evaluation/routes.test.ts` | pass (6 tests) |
| Dashboard evaluation consent, wallet, checkout, and receipt UI | `cd web && npm run test:e2e -- e2e/level4.spec.ts` | pass (1 test; mocked gateway/Stripe/Freighter) |
| Web type safety, lint, and production instrumentation build | `cd web && npm run typecheck`; `cd web && npm run lint`; `cd web && npm run build` | pass; lint has 0 errors and 6 pre-existing warnings |

## T7 narrow evidence

| Behavior | Command | Result |
|---|---|---|
| Gateway Sentry initialization and recursive scrub | `cd ts && npm test -- --run telemetry/sentry.test.ts telemetry/sentry-scrub.test.ts` | pass (4 tests) |
| Dedicated retention purge authorization and bounded scheduler | `cd ts && npm test -- --run evaluation-routes.test.ts` | pass (7 tests) |
| Fee-sponsor scrubber and Sentry service boundary | `cd services/fee-sponsor && npm test`; `cd services/fee-sponsor && npm run typecheck` | pass (1 test); pass |
| Synthetic URL validation, bounded retry, three cold/warm labels, and redacted output | `node --test scripts/level4-synthetic.test.mjs`; `node --check scripts/level4-synthetic.mjs` | pass (3 tests) |
| Browser analytics regression after privacy fixes | `cd web && npm test -- --run src/lib/analytics.test.ts` | pass (6 tests) |
| CI wiring | `.github/workflows/ci.yml`, `.github/workflows/deploy-smoke.yml` inspected; exact variables and branch trigger present | pass (static review); hosted variables not available locally |

## T8 final reconciliation

The package-wide rows above were run from the clean Level 4 worktree. The
requirement audit confirms the exact consent version and participant ID shape,
isolated migration `0009`, testnet-only SEP-53 proof rules, 90-day purge,
unique wallet/deposit/session ownership, retryable checkout claims, filtered
Stripe relay metadata, opt-in telemetry, recursive scrubbing, and preservation
of the launch-era deposit and ticket-allocation path.

External release artifacts remain pending until deployment credentials, hosted
URLs, Stripe test ingress, telemetry access, fresh screenshots, and ten
distinct consenting participants are available.

## Required behavior evidence

Add focused results for identity, SEP-53, expiry/replay/rate limits, unique
ownership, receipt/concurrent webhook behavior, retention, evidence redaction,
analytics allowlisting/reset, recursive scrubbing, and migration-twice/
real-Postgres cases. Mark unavailable external checks as pending or blocked
with the exact reason; never convert them into local passes.
