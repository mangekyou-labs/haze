---
phase: testing
title: Stellar Launch — Level 4 verification record
description: Fresh verification evidence for the additive evaluation milestone
---

# Stellar Launch — Level 4 verification record

Date: 2026-09-11  
Feature slug: `stellar-launch`  
Status: pending fresh execution

Only commands run in the clean Level 4 worktree may be recorded here. Donor
claims, development screenshots, and stale lockfile results are excluded.

## Local command matrix

| Area | Command | Result |
|---|---|---|
| AI DevKit lint | `npx ai-devkit@latest lint --feature stellar-launch` | pending |
| Gateway | `cd ts && npm run typecheck` | pass (T1; shared package built first) |
| Gateway tests | `cd ts && npm test` | pending |
| Web tests/types/build/E2E | `cd web && npm test`, typecheck, build, E2E | pending |
| Sidecar/shared | package checks | pending |
| Fee sponsor | typecheck/tests | pending |
| Circuits | circuit test suite | pending |
| Soroban contract | `cargo test` | pending/toolchain-dependent |
| Synthetic monitor | `node --check scripts/synthetic-monitor.mjs` | pending |
| Whitespace | `git diff --check` | pending |

## T1 narrow evidence

| Behavior | Command | Result |
|---|---|---|
| Identity, consent, SEP-53, expiry/replay, rate limits, ownership, feedback, retention, checkout, redacted evidence | `cd ts && npm test -- --run evaluation.test.ts` | pass (12 tests) |
| Migration ordering/isolation and schema registry | `cd ts && npm test -- --run db/migrate.test.ts db/config.test.ts` | pass (14 tests; 1 opt-in database test skipped) |

The failing-first evidence for T1 is recorded in the implementation document;
the initial run failed to resolve `./evaluation.js` before the adapter was
implemented. No external deployment or cohort evidence is claimed.

## T2 narrow evidence

| Behavior | Command | Result |
|---|---|---|
| Postgres migration twice, restart durability, and concurrent checkout ownership | `RUN_DB_TESTS=1 TEST_DATABASE_URL=postgres://localhost:55432/postgres npm test -- --run evaluation-postgres.integration.test.ts` | pass (3 tests, disposable local cluster) |
| Gateway lifecycle injection and evaluation adapter compile | `npm run typecheck` | pass |

## T3 narrow evidence

| Authenticated route boundary, consent/status redaction, proof replay, validation, feedback ordering, deposit linking, checkout ownership | `cd ts && npm test -- --run evaluation-routes.test.ts server.test.ts` | pass (57 tests) |
| Gateway route type safety | `cd ts && npm run typecheck` | pass |

## Required behavior evidence

Add focused results for identity, SEP-53, expiry/replay/rate limits, unique
ownership, receipt/concurrent webhook behavior, retention, evidence redaction,
analytics allowlisting/reset, recursive scrubbing, and migration-twice/
real-Postgres cases. Mark unavailable external checks as pending or blocked
with the exact reason; never convert them into local passes.
