---
phase: planning
title: Stellar Launch — Level 4 delivery plan
description: TDD task plan for the additive consent-based evaluation milestone
---

# Stellar Launch — Level 4 delivery plan

Date: 2026-09-11  
Feature slug: `stellar-launch`  
Branch: `feature-stellar-launch-level4`  
Base: `1c17e14`  
Status: in progress

## Worktree and source boundary

Implementation is isolated at
`/Users/kyler/repos/feature-zk-api-credits/.worktrees/feature-stellar-launch-level4`.
The donor `feature-zk-api-credits` worktree is read-only reference material;
its full diff and lockfiles are not applied.

## Task sequence

| Task | Scope | Status | Required evidence |
|---|---|---|---|
| T1 | Domain invariants, memory store, migration contract | complete | failing/passing unit tests; `0009` checks |
| T2 | Postgres adapter and injected pool/migration lifecycle | complete | disposable Postgres tests; migration twice |
| T3 | Authenticated gateway evaluation router | complete | route auth/validation/status tests |
| T4 | Checkout receipts, retryable billing, existing staged deposit integration | active | duplicate/concurrent webhook/deposit tests |
| T5 | Web server proxies, consent-gated checkout, receipt/status APIs | pending | route/unit tests; existing checkout tests |
| T6 | Dashboard evaluation flow and privacy telemetry | pending | web unit/E2E; PostHog/Sentry scrub tests |
| T7 | Fee-sponsor Sentry, synthetic CI, locks, operations/evidence docs | pending | service typecheck; workflow/script checks; docs audit |
| T8 | Full verification and final review reconciliation | pending | fresh command matrix and requirement audit |

## Per-task workflow

For every task: inspect the current target, add a focused failing test, make
the minimum implementation change, refactor, run the narrow and affected
checks, then update requirements/design/planning/implementation/testing and
the evidence index with facts only. Existing launch behavior is a regression
gate at every integration task.

## Dependencies and external gates

T1–T7 are local and can proceed without provider credentials. T2's live SQL
cases require a disposable Postgres instance. Deployment, GitHub publication,
Stripe ingress, Sentry/PostHog screenshots, three hosted synthetic passes,
fresh deployed screenshots, and ten consenting participants remain explicit
external gates for T8.
