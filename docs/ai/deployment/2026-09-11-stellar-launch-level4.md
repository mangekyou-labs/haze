---
phase: deployment
title: Stellar Launch — Level 4 deployment runbook
description: Testnet-only deployment order and external acceptance gates
---

# Stellar Launch — Level 4 deployment runbook

Date: 2026-09-11  
Feature slug: `stellar-launch`  
Status: local implementation in progress; no deployment claimed

## Configuration boundary

The web service owns `EVALUATION_HMAC_SECRET`, NextAuth/GitHub credentials,
Stripe test credentials, and the PostHog browser key. Gateway and fee sponsor
receive only their existing secrets/configuration plus the derived participant
ID on authenticated internal requests. A restricted Postgres database is
required for production evaluation persistence.

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
4. Run three cold/warm synthetic passes using the `LEVEL4_*` CI variables.
5. Complete the distinct-participant cohort and generate the redacted export.
6. Replace pending evidence, reconcile lifecycle docs, perform final review,
   repair GitHub authentication, and publish only after direct evidence exists.

## Rollback and retention

Web/gateway/fee-sponsor deployments can roll back independently. Do not drop
the evaluation schema to roll back. Purge only through the scheduled retention
operation and preserve an audit record of the count; never publish restricted
rows.
