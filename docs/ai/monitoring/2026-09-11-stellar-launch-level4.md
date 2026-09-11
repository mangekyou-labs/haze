---
phase: monitoring
title: Stellar Launch — Level 4 monitoring
description: Privacy-preserving telemetry and synthetic response plan
---

# Stellar Launch — Level 4 monitoring

Date: 2026-09-11  
Feature slug: `stellar-launch`  
Status: implementation in progress

## PostHog

Start opted out. Enable only after an explicit evaluation checkbox and send a
closed allowlist of coarse event names/properties. Disable autocapture,
pageviews, session recording, surveys, and arbitrary free text. Logout removes
consent and resets the client identity.

## Sentry

Use recursive depth-bounded scrubbing before send in web, gateway, and fee
sponsor. Remove authorization, cookies, prompts, request/body data, secrets,
mnemonics, proofs, commitments, signatures, wallet fields, API keys,
passwords, private keys, tokens, subjects, and identity fields. Disable default
PII, local variables, and breadcrumbs.

## Synthetic monitor

The scheduled/manual CI workflow reads `LEVEL4_FRONTEND_URL`,
`LEVEL4_GATEWAY_URL`, and `LEVEL4_FEE_SPONSOR_URL`, then checks frontend,
gateway health/contract status, and fee-sponsor health with bounded timeout and
retries. A missing fee-sponsor URL fails the required CI workflow.

## Response

Treat gateway, contract, or fee-sponsor failure as a cohort blocker. The web
may describe free-host cold starts and offer retry, but no uptime SLA is
claimed. Monitoring output contains labels, statuses, durations, and safe
error classes only.
