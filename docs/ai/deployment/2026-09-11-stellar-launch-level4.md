---
phase: deployment
title: Stellar Launch — Level 4 deployment runbook
description: Testnet-only deployment order and external acceptance gates
---

# Stellar Launch — Level 4 deployment runbook

Date: 2026-09-11  
Feature slug: `stellar-launch`  
Status: local implementation complete; no deployment claimed

## Configuration boundary

The web service owns `EVALUATION_HMAC_SECRET`, NextAuth/GitHub credentials,
Stripe test credentials (`sk_test_`), and the PostHog browser key. Gateway and
fee sponsor receive only their existing secrets/configuration plus
`EVALUATION_PURGE_SECRET` / `EVALUATION_PURGE_INTERVAL_MS` on the gateway and
the derived participant ID on authenticated internal requests. The gateway
never receives `EVALUATION_HMAC_SECRET`. A restricted Postgres database is
required for production evaluation persistence. `.env.example` and
`web/.env.example` list these names; they are not populated in this worktree.
A Vercel GitHub integration preview for `de394b3` is not a Level 4
deployment: repository `LEVEL4_*` variables, evaluation secrets, Stripe test
ingress, and a durable evaluation database are unset.

No mnemonic, private wallet key, raw signature, proof, prompt, API key, or
GitHub subject belongs in environment output, Stripe metadata, telemetry,
evidence, or CI logs.

## Release sequence

1. Back up/inspect the target database and apply migrations `0001`–`0009` with
   the existing idempotent runner; run it twice and verify the isolated schema.
2. Deploy gateway and fee sponsor; verify durable startup, health, contract
   status, fee relay, and scrubbed error capture.
3. Deploy web; verify consent enrollment, wallet proof, checkout return,
   webhook retry, explorer link, feedback, and logout analytics reset.
4. Configure the non-secret repository variables
   `LEVEL4_FRONTEND_URL`, `LEVEL4_GATEWAY_URL`, and
   `LEVEL4_FEE_SPONSOR_URL`, then run three cold/warm synthetic passes. The
   monitor fails closed when any variable is missing and never prints URLs or
   response bodies.
5. Complete the distinct-participant cohort and generate the redacted export.
6. Replace pending evidence, reconcile lifecycle docs, perform final review,
   repair GitHub authentication, and publish only after direct evidence exists.

## Retention operation

The gateway starts a non-overlapping daily purge after Postgres initialization.
For an operator-triggered run, send `POST /v1/internal/evaluation/purge` with
`Authorization: Bearer $EVALUATION_PURGE_SECRET`; this is a separate secret
from `GATEWAY_SECRET` and the response contains only `{ "purged": number }`.
Keep the secret in the gateway runtime configuration and do not place it in
web, Stripe metadata, telemetry, or evidence.

## Rollback

Web/gateway/fee-sponsor deployments can roll back independently. Do not drop
the evaluation schema to roll back. Preserve an audit record of the purge
count; never publish restricted rows.
