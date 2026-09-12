# Stellar Launch Level 4 Evaluation Design

**Date:** 2026-09-11  
**Status:** Approved in conversation  
**Feature slug:** `stellar-launch`  
**Base:** `1c17e14`  
**Scope:** Port Level 4 evaluation behavior onto the clean Stellar Launch
codebase while preserving the launch-era gateway, billing, deposit, sidecar,
and fee-sponsor behavior.

## Goal

Add a consent-based, testnet-only evaluation flow to the existing Stellar
Launch dashboard. An authenticated GitHub participant can enroll, prove
control of one Freighter testnet wallet, complete one explicit $1 Stripe test
checkout that uses an existing browser-held commitment, link the resulting
testnet deposit, and submit fixed feedback. The system can later produce a
minimum-ten-participant redacted evidence export and purge restricted wallet
proof material after 90 days.

The evaluation layer is an adjunct to the launch product. It does not replace
ticket allocation, the staged durable membership-tree deposit path, the
existing Stripe billing store, private API request storage, the sidecar, or
the fee-sponsor relay.

## Approaches considered

1. **Additive evaluation adapter and router (chosen).** Add an isolated
   evaluation domain, memory/Postgres adapters, migration `0009`, internal
   routes, and dashboard proxies while composing with the existing gateway
   application and injected pool. Extend the existing checkout/webhook seam
   only where evaluation metadata and retry state are needed.
2. **Wholesale donor transplant.** Copy the donor server, database, and web
   diff, then repair launch behavior afterward. This is rejected because the
   donor contains unrelated launch-era regressions and deletes or replaces
   durable ticket, billing, deposit, sidecar, and fee-sponsor code.
3. **Separate evaluation service.** Isolate evaluation in another process and
   database. This is rejected because the required authenticated gateway
   endpoints and existing injected Postgres migration lifecycle would no
   longer be the integration boundary.

## Boundaries and identity

- The web service derives a participant ID as
  `HMAC-SHA256(EVALUATION_HMAC_SECRET, authenticated GitHub subject)`.
- `EVALUATION_HMAC_SECRET` exists only in the web service. The gateway never
  receives or derives it; it receives the resulting 64-character lowercase
  hexadecimal ID in `x-evaluation-participant-id` over the existing
  `GATEWAY_SECRET`-authenticated internal channel.
- Public responses expose only `L4-<first 12 hex characters>` and other
  explicitly safe status fields. They never expose a subject, full HMAC,
  complete wallet address, or raw signature.
- Consent is exact-match gated on `level4-2026-09-11`.
- Wallet proofs accept only canonical SEP-53 signatures for Stellar Testnet.
- Evaluation records are never joined to prompts, proofs, API keys, accepted
  calls, commitments, or private provider responses.

## Gateway architecture

### Store and migration

Create an `EvaluationStore` contract with equivalent memory and Postgres
implementations. The memory implementation is used by unit tests through an
explicit setter/reset helper. Production initialization reuses the Pool
created by `initDurableGatewayStore`, runs the existing migration runner over
`0001` through `0009_evaluation.sql`, and injects a Postgres evaluation store.

The new `evaluation` schema contains participants, one-time wallet
challenges, and ownership-bound checkout receipts. Unique constraints cover
participant IDs, public codes, `wallet_fingerprint`, deposit transaction
hashes, and checkout session IDs. Raw wallet addresses and signatures are
restricted columns and are nulled by the scheduled retention purge. The
fingerprint (SHA-256 of the address, 64-hex) stays so the same wallet cannot
be bound to another participant after purge. Same-wallet re-verify is
idempotent and does not restore raw proof columns.

The target's existing `db/client.ts`, `db/config.ts`, `db/migrate.ts`, and
gateway store are preserved. The donor's parallel database configuration and
migration files are not copied over them.

### Domain invariants

- Enrollment is stable for the same participant and rejects a changed consent
  version.
- Challenges expire after ten minutes, are single-use, and are rate limited
  to five creations per rolling fifteen minutes per participant. The Postgres
  adapter serializes that count with `SELECT … FOR UPDATE` on the participant
  row.
- A participant can bind one wallet; a wallet can belong to only one
  participant. Wallet replacement is rejected.
- Deposits require a verified wallet, accept a canonical 64-hex transaction
  hash, and enforce one participant per transaction and one transaction per
  participant.
- Feedback requires wallet verification and a linked confirmed deposit. The
  six fields are validated and bounded at the gateway boundary.
- Checkout receipts are ownership-bound and idempotent. A confirmed receipt is
  immutable (`markCheckout` and `claimCheckout` refuse to leave `confirmed`).
  Concurrent requests cannot create two membership leaves for one checkout.
  If Stellar accepts the deposit and the process dies before the receipt
  stores the hash, tree reconstruction still blocks a second leaf, but the
  hash cannot be rebuilt without a chain reconciler. This milestone does not
  add a reconciler.
- Evidence requires at least ten complete records with ten unique wallets and
  ten unique transaction hashes. Export completeness still requires a raw
  wallet address, so post-purge records do not count. Exported wallets are
  redacted and raw proof material, subjects, and private API data are absent.
  Public status may still show `wallet.verified` and `complete` after purge
  because those flags key on `wallet_verified_at`.

### Internal routes

Mount these routes under the existing readiness-gated `/v1` application. Every
route requires both `Authorization: Bearer <GATEWAY_SECRET>` and a valid
`x-evaluation-participant-id`:

- `POST /v1/evaluation/enroll`
- `GET /v1/evaluation/status`
- `POST /v1/evaluation/challenge`
- `POST /v1/evaluation/wallet-proof`
- `POST /v1/evaluation/feedback`
- `POST /v1/evaluation/deposit`
- `POST|GET /v1/evaluation/checkout`
- `POST /v1/evaluation/checkout/status`

Route validation returns stable safe error codes and maps rate limiting,
expiry, ownership conflicts, not-enrolled state, and invalid proofs to
appropriate HTTP statuses. Wallet-proof requests do not trust a client-
supplied challenge message; the stored challenge is the canonical message.

### Billing and deposit integration

The existing `/v1/deposits` handler and `submitDeposit` implementation remain
the only on-chain deposit path. Evaluation checkout processing passes through
that staged path, including the current durable reservation, contract
submission, activation, indexed leaf allocation, and serialized pending-leaf
behavior.

The existing billing store remains the event ledger. Its webhook handling is
extended so:

- a processed duplicate is acknowledged without another submission;
- an unprocessed event is eligible for retry/resumption;
- evaluation receipts provide ownership and durable checkout state;
- an atomic processing claim or equivalent durable compare-and-set prevents
  concurrent webhook deliveries from inserting a second membership leaf;
- a failed attempt leaves enough unprocessed state for Stripe retry rather
  than falsely acknowledging the payment; and
- the documented crash window after chain accept and before receipt hash
  persistence is not treated as silent resume-without-resubmit.

Non-evaluation checkout tiers and the launch billing contract retain their
current behavior.

## Web architecture

- Add server-only evaluation API helpers that authenticate the current session,
  derive the HMAC, and proxy only allowlisted request fields to the gateway.
- Add route handlers for enrollment, status, challenge, wallet proof,
  feedback, analytics opt-in, checkout receipt, and any required checkout
  status read path. No gateway secret or HMAC secret reaches the browser.
  Browser POSTs to `/api/evaluation/checkout`, `/checkout/status`, and
  `/deposit` return 405 (`Allow: GET` on checkout GET, `Allow: OPTIONS` on
  the mutation-only POSTs).
- Add the Level 4 surface to the current dashboard without removing launch
  onboarding, API-key configuration, playground, usage status, or purchase
  flows.
- Gate the `$1` evaluation checkout on explicit consent/enrollment, Stripe
  test mode (`sk_test_`), and a browser-held commitment. The Stripe session
  amount is exactly 100 cents. Only then attach participant metadata to
  Stripe; metadata contains opaque evaluation identifiers, never GitHub
  subjects, wallet addresses, signatures, prompts, proofs, or API keys.
  Stripe and billing error responses return a stable public code only.
- Freighter integration checks Testnet, requests the stored challenge, accepts
  supported signature encodings, and sends only the proof fields needed for
  server verification.
- Checkout return status is bounded/retryable and shows a safe explorer link
  only after the gateway records a confirmed transaction.

## Telemetry and privacy

PostHog is opt-in only, uses a closed event allowlist with coarse bounded
properties, disables autocapture/session recording/pageview capture, and
resets on logout. Evaluation free text, wallet data, signatures, commitments,
prompts, API keys, subjects, and tokens are never analytics properties.

Sentry scrubbing is recursive, depth-bounded, and applied before sending in
the web, gateway, and fee-sponsor services. Sensitive key names are removed
from nested objects and arrays; default PII, breadcrumbs, and local variable
capture remain disabled.

## Operations and documentation

- Add a scheduled synthetic monitor to existing CI using
  `LEVEL4_FRONTEND_URL`, `LEVEL4_GATEWAY_URL`, and `LEVEL4_FEE_SPONSOR_URL`.
- Reconcile the `stellar-launch` requirements, design, planning,
  implementation, testing, deployment, monitoring, and evidence-index
  documents after each implementation task.
- Regenerate each changed package's dependency metadata and lockfile in the
  new worktree using its manifest; do not copy donor lockfiles.
- Keep development screenshots clearly non-final until fresh deployed
  evidence exists. External deployment, credentials, ten-person cohort,
  Stripe test payment, explorer confirmation, and unlisted demonstration are
  explicit rollout gates, not claims supported by local tests.

## Test-first plan

Each behavior starts with a failing test, followed by the minimum
implementation and refactoring. Coverage includes identity stability and
secret boundaries, SEP-53 canonicalization and Testnet-only enforcement,
challenge expiry/replay/rate limits, duplicate wallet/deposit ownership,
checkout ownership/idempotency/concurrency, retryable webhook processing,
feedback validation, retention purge, evidence redaction and ten-record
minimums, analytics allowlisting/logout reset, and recursive telemetry
scrubbing.

Disposable real-Postgres tests run the full migration set twice and exercise
concurrent/idempotent checkout and deposit behavior. Existing launch tests,
sidecar tests, fee-sponsor tests, circuit tests, web tests/E2E/build, Rust
tests, lint, TypeScript checks, and `git diff --check` remain part of final
verification.

## Rollout order

1. Apply and verify the database migration.
2. Deploy and verify gateway plus fee sponsor.
3. Deploy and verify web, Stripe test checkout, and the Vercel webhook.
4. Run three cold/warm synthetic passes and scrubbed telemetry checks.
5. Complete the ten-person cohort and gather consented feedback, fresh
   screenshots, redacted export, explorer-confirmed deposits, and the unlisted
   demonstration.
6. Reconcile lifecycle implementation documents and complete final review
   before publishing the branch or opening a PR.

## Known external gates

Local implementation and verification may proceed without provider
credentials. Deployment, GitHub push/PR authentication, live Stripe ingress,
Sentry/PostHog dashboards, hosted synthetic passes, fresh deployed screenshots,
and a genuine ten-person cohort require external credentials or participants
and must be recorded as blocked or pending until directly evidenced.
