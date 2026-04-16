# Blackmail Vault — Threat Model (DRAFT)

**Date:** 2026-04-16
**Status:** DRAFT — legal review not yet started. **K phase is GATED on sign-off of this document.**

---

## 1. Purpose

`specs.md §22` allows a goddess to store encrypted "blackmail material" (photos, videos, text) tied to a sub, with explicit per-upload consent. This document captures the abuse vectors, legal framing, and revocation guarantees required before any code in phase K ships.

## 2. Legal framing

- **Jurisdiction:** England & Wales. UK Theft Act 1968 s. 21 (blackmail) — an unwarranted demand with menaces for gain is a criminal offence.
- **Safe harbour pattern:** consensual kink roleplay explicitly framed as fantasy, retained only with active consent, revocable at will, purged within 24h of revocation.
- **GDPR:** sub is a data subject. Right to erasure must be honoured within 30 days (target 24h here). Right of access via profile page.
- **Record to keep:** `consent_event` row per upload with versioned `consent_text` hash, timestamp, IP omitted, user-agent omitted.

## 3. Assets

| Asset | Confidentiality | Integrity | Availability |
|-------|-----------------|-----------|--------------|
| Encrypted blob (R2) | **high** (only goddess passphrase decrypts) | high (HMAC in ciphertext envelope) | low (purgeable) |
| Metadata row (`blackmail_material`) | medium | high | medium |
| Consent event | medium | **high** (legal evidence) | medium |
| Goddess passphrase | **critical** (never leaves browser) | n/a | n/a |

## 4. Threat actors

- **Malicious sub** — tries to recover uploaded material or to forge consent revocations.
- **Malicious goddess** — tries to use material outside consensual kink.
- **Server compromise** — attacker reads DB + R2.
- **Browser compromise on goddess side** — attacker reads passphrase.
- **Legal seizure** — subpoena or warrant.

## 5. Controls

- Client-side encryption with libsodium (XChaCha20-Poly1305) keyed from goddess passphrase via Argon2id (KDF) — server never sees plaintext.
- Per-upload `consent_event` referencing a versioned `consent_text` row.
- Passphrase never persisted (no `localStorage`); re-entered each session.
- 24h hard-delete job on `revoked_at`.
- Contract clause linkage: revoking a vault item tied to a clause invalidates the clause (`clauses_json[].clause_invalidated=true`) but does not breach the contract.
- `admin_action` audit on every reveal + revoke.

## 6. Revocation guarantees

- `POST /vault/materials/{id}/revoke` stamps `revoked_at` + queues `vault.gc` job.
- GC job deletes R2 object, overwrites metadata, writes `destroyed_at` on row (tombstone).
- `GET /vault/materials/{id}` after revoke → `410 Gone`.

## 7. Open questions (for legal review)

- [ ] Explicit consent text wording (bilingual FR/EN if scope expands?).
- [ ] Retention of `consent_event` after material destroyed (statute-of-limitations default: 6 years).
- [ ] Can a sub request pre-upload destruction of material not yet uploaded? (N/A — nothing to destroy.)
- [ ] Cross-border data transfer (R2 EU region pinning).
- [ ] Coercive control / Serious Crime Act 2015 s. 76 — affirmative-consent UI copy requirements.

---

**Sign-off required from:** repo owner + legal counsel.
**Before phase K starts:** this document must be filled, reviewed, and committed as non-DRAFT.
