# Stellar Launch — Level 4 evidence index

Snapshot: 2026-09-12
Feature slug: `stellar-launch`  
Status: local implementation verified; release evidence pending

This index is intentionally conservative. It will contain only fresh deployed
links, consented cohort records, redacted exports, and current screenshots
after those artifacts are directly verified. No donor-worktree screenshot,
development capture, or unrelated transaction is counted as Level 4 evidence.

## Required submission artifacts

- deployed web, gateway, and fee-sponsor URLs with current health checks;
- three cold/warm synthetic passes;
- scrubbed Sentry test event and consented PostHog event evidence;
- one complete retried $1 Stripe test checkout and explorer-confirmed deposit;
- ten distinct participants, wallets, deposits, transaction hashes, and
  consented feedback records;
- generated redacted `evidence.json`/`evidence.md`;
- desktop/mobile/current dashboard screenshots with all secrets and personal
  account data removed;
- 4–6 minute unlisted demonstration;
- final branch/PR and lifecycle review references.

## Cohort table

| Participant | Wallet | Confirmed testnet transaction | Completed | Feedback |
|---|---|---|---|---|
| 0 / 10 available | — | — | — | — |

The table must be populated only from the exporter after its ten-record,
unique-wallet, unique-transaction gate succeeds. Full wallets, signatures,
subjects, prompts, proofs, commitments, API keys, and authorization headers
must never be committed.

## Local verification

Fresh local command results, including the final package-wide matrix, are recorded in
[`docs/ai/testing/2026-09-11-stellar-launch-level4.md`](../../ai/testing/2026-09-11-stellar-launch-level4.md).
The current local implementation also has fresh T4 evidence for atomic
checkout claims and retryable billing in the testing record; it is not a
deployment or cohort artifact.
The web proxy and consent-gated checkout slice also has fresh focused tests
and a clean typecheck recorded in the T5 testing record; these do not replace
deployed Stripe, explorer, telemetry, screenshot, or cohort evidence.
The dashboard consent/wallet/checkout/feedback slice, opt-in PostHog boundary,
logout reset, browser Sentry scrubber, and target production build have fresh
local evidence in the T6 testing record. The E2E uses mocked provider
boundaries; it is not a hosted checkout, explorer, or telemetry artifact.
T7 adds fresh local gateway/fee-sponsor Sentry tests, dedicated purge-route and
scheduler tests, and synthetic monitor tests; T8 adds the final cross-package
verification and persistence-race checks. None of these claims hosted
synthetic passes or deployed telemetry.
Until the external gates above are directly evidenced, this index must not
state that Level 4 is releasable.
