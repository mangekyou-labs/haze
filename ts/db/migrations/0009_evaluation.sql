-- Level 4 evaluation records are deliberately isolated from gateway, billing,
-- and fee-sponsor state.  Raw wallet proof material is retained only until
-- retention_deadline and is removed by the scheduled purge job.
CREATE SCHEMA IF NOT EXISTS evaluation;

CREATE TABLE IF NOT EXISTS evaluation.participants (
  participant_id text PRIMARY KEY,
  public_code text NOT NULL UNIQUE,
  consent_version text NOT NULL,
  enrolled_at timestamptz NOT NULL,
  retention_deadline timestamptz NOT NULL,
  wallet_address text UNIQUE,
  wallet_fingerprint text UNIQUE,
  wallet_signature text,
  wallet_verified_at timestamptz,
  deposit_tx_hash text UNIQUE,
  deposit_explorer_url text,
  deposit_new_root text,
  deposit_confirmed_at timestamptz,
  ease_rating integer,
  task_completed boolean,
  would_use_again boolean,
  most_valuable_aspect text,
  biggest_friction text,
  quote_consent boolean,
  feedback_submitted_at timestamptz,
  anonymized_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT participants_id_format CHECK (participant_id ~ '^[a-f0-9]{64}$'),
  CONSTRAINT participants_public_code_format CHECK (public_code ~ '^L4-[a-f0-9]{12}$'),
  CONSTRAINT participants_wallet_fingerprint_format CHECK (
    wallet_fingerprint IS NULL OR wallet_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT participants_feedback_rating CHECK (ease_rating IS NULL OR ease_rating BETWEEN 1 AND 5),
  CONSTRAINT participants_feedback_pair CHECK (
    (ease_rating IS NULL AND task_completed IS NULL AND would_use_again IS NULL
      AND most_valuable_aspect IS NULL AND biggest_friction IS NULL
      AND quote_consent IS NULL AND feedback_submitted_at IS NULL)
    OR (ease_rating IS NOT NULL AND task_completed IS NOT NULL AND would_use_again IS NOT NULL
      AND most_valuable_aspect IS NOT NULL AND biggest_friction IS NOT NULL
      AND quote_consent IS NOT NULL AND feedback_submitted_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS evaluation.wallet_challenges (
  challenge_id text PRIMARY KEY,
  participant_id text NOT NULL REFERENCES evaluation.participants(participant_id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS wallet_challenges_participant_created_idx
  ON evaluation.wallet_challenges (participant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS evaluation.checkout_receipts (
  checkout_session_id text PRIMARY KEY,
  participant_id text NOT NULL REFERENCES evaluation.participants(participant_id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents = 100),
  processing_status text NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'confirmed', 'failed')),
  event_id text,
  deposit_tx_hash text UNIQUE,
  new_root text,
  received_at timestamptz NOT NULL DEFAULT NOW(),
  processing_started_at timestamptz,
  processed_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  CONSTRAINT checkout_session_id_nonempty CHECK (length(checkout_session_id) BETWEEN 1 AND 255),
  CONSTRAINT checkout_transaction_hash_format CHECK (
    deposit_tx_hash IS NULL OR deposit_tx_hash ~ '^[a-fA-F0-9]{64}$'
  )
);

CREATE INDEX IF NOT EXISTS checkout_receipts_participant_idx
  ON evaluation.checkout_receipts (participant_id, received_at DESC);
CREATE INDEX IF NOT EXISTS checkout_receipts_retry_idx
  ON evaluation.checkout_receipts (processing_status, processing_started_at);

COMMENT ON TABLE evaluation.participants IS
  'Restricted Level 4 participant records; purge wallet address and signature after retention_deadline.';
COMMENT ON COLUMN evaluation.participants.wallet_signature IS
  'Raw SEP-53 proof material; never expose through authenticated status endpoints.';
COMMENT ON COLUMN evaluation.participants.wallet_fingerprint IS
  'Pseudonymous SHA-256 ownership marker retained after raw proof purge to prevent wallet reuse.';
COMMENT ON TABLE evaluation.checkout_receipts IS
  'Durable ownership and retry state for the consent-gated $1 evaluation checkout.';
