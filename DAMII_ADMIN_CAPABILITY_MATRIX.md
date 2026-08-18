# DAMII Platform: Admin Capability Matrix

This is the full admin surface, organized by data node (table) instead of by workflow. For every table in the schema, this lists every action an admin can take on it — view, create, edit, state-transition, override, export.

**Status column key:**
- **Speced** — fully defined in the implementation guide or the admin model spec, build as written there.
- **New** — defined here for the first time, ready to build.
- **Needs decision** — a real gap. Don't build silently; get an explicit answer first, since these all touch money, account access, or platform trust.

---

## 1. Users

| Action | What it does | Status |
|---|---|---|
| List / search users | Filter by phone, name, role, verification status, region | New |
| View user detail | Profile fields, role, `phoneVerifiedAt`/`emailVerifiedAt`, both ledger balances (`available`, `escrow`) | New |
| View user's ledger history | All `ledgerEntries` where `userId = X`, chronological | New |
| View user's match history | All matches where `playerAId` or `playerBId = X` | New |
| View user's tournament history | Entries joined as player; tournaments owned as organizer | New |
| View user's audit trail | All `adminAuditLog` rows referencing this user directly or via their matches/tournaments | New |
| Manually adjust balance | Support/error-correction ledger entry outside normal flows | **Needs decision** — see 1.1 below |
| Suspend / reactivate account | Blocks login and/or new matches/tournaments without deleting history | **Needs decision** — no suspension concept exists yet |
| Force logout / revoke sessions | Kill active sessions for a compromised account | **Needs decision** |
| Change role manually | Force-promote/demote outside the organizer application flow | **Needs decision** — should this exist at all, or only via application approval / revocation? |
| Unlink/reset phone number | Support case: number changed devices, lost access, etc. | **Needs decision** — has fraud implications, needs its own verification step |

**1.1 — Manual balance adjustment**, if approved, should never be a raw UPDATE. It's a `writeLedger` call with a new `entryType: "admin_adjustment"`, a mandatory `note` (becomes the audit record), and probably a second-admin confirmation step given it can move real money with no underlying match/tournament event to justify it. Flag this to the team specifically — it's the single highest-risk action in this whole list.

---

## 2. OTP Requests

| Action | What it does | Status |
|---|---|---|
| View OTP history for a phone number | Support/fraud investigation — every send + verify attempt | New |
| Clear rate-limit lockout | Manual override when `canSendOtp` blocks a legitimate user | **Needs decision** |
| Flag suspicious patterns | Report view: numbers/IPs hitting rate limits repeatedly | New (reporting only, no write action) |

---

## 3. Organizer Applications

| Action | What it does | Status |
|---|---|---|
| List / filter by status | pending / approved / rejected / needs_info | Speced — implementation guide §5 |
| View application detail | All submitted fields + documents + applicant's account context | Speced — implementation guide §5 |
| Approve | Sets `status`, `users.role = "organizer"`, same transaction | Speced |
| Reject | Sets `status`, `reviewNote`, no role change | Speced |
| Request more info | `status = "needs_info"`, applicant edits same row | Speced |
| Revoke organizer status | Demote an already-approved organizer (misconduct, fraud) | **Needs decision** — nothing in the guide covers de-approval; what happens to their live tournaments when this happens also needs an answer |

---

## 4. Game Type Limits

| Action | What it does | Status |
|---|---|---|
| List all game types' limits | Table view of every configured game type | Speced — implementation guide §8 |
| View one game type | Single row detail | Speced |
| Create limits row | New game type onboarding | Speced |
| Edit limits | min/max wager, min/max prize pool, platform fee % | Speced |
| View change history | Who changed what limit, when | **New** — add `writeAudit()` call to the existing edit route (`actionType: "game_type_limits_update"`, `beforeState`/`afterState`) so this is queryable via the audit log; the table itself only stores current values |

---

## 5. Ledger Entries

Ledger rows are insert-only by design — no admin edit/delete action exists or should exist. Admin actions here are read, reconcile, and (exceptionally) append.

| Action | What it does | Status |
|---|---|---|
| View global ledger feed | All entries, filterable by `entryType`, `accountType`, `userId`, date range | New |
| View entries by reference | Full money trail for one match or tournament (`referenceType` + `referenceId`) | New |
| Reconciliation check | Recompute a user's balance by summing all their entries, compare to latest `balanceAfter`, flag mismatches | Speced — implementation guide §2.2, needs an admin-facing trigger/report built around it |
| Manual adjustment entry | See 1.1 above | **Needs decision** |
| Export ledger data | CSV export for accounting/compliance over a date range | New |

---

## 6. Matches

| Action | What it does | Status |
|---|---|---|
| List / filter matches | By status, `disputeStatus`, game type, date, player | New |
| View match detail | Players, wager, status, winner, fee breakdown | New |
| View match's ledger trail | All `ledgerEntries` where `referenceType = "match"` | New |
| View move log | Full `matchMoveLog` for any match, not just disputed ones (support use) | New — same table as dispute review, broader access |
| View connection events | Full `matchConnectionEvents` for any match | New — same table, broader access |
| Open dispute | Freezes result + rewards, starts review | Speced — admin model spec §2.2 |
| Resolve dispute — confirm | Original result stands, rewards released | Speced |
| Resolve dispute — correct | Reverses and re-settles to a corrected winner | Speced |
| Resolve dispute — void | Full refund to both players, no fee retained | Speced |
| Force-cancel a stuck match | A match stuck in `open`/`in_progress` with no path to natural resolution (e.g. game engine crash) | **Needs decision** — what refund rule applies here vs. the normal unjoined-match no-penalty path |

---

## 7. Match Disputes (as its own node, beyond the resolve action)

| Action | What it does | Status |
|---|---|---|
| List all disputes | Filter by status (open/confirmed/corrected/voided), date, admin | New |
| View dispute detail | Reason, resolution, resolving admin, timestamps | New — mostly covered by the audit log, but a dedicated view is worth having since disputes are the highest-scrutiny action in the system |

---

## 8. Tournaments

| Action | What it does | Status |
|---|---|---|
| List / filter tournaments | By status, organizer, game type, date | New |
| View tournament detail | Prize structure, entry fee, status, escrow balances | New |
| View tournament's ledger trail | All `ledgerEntries` where `referenceType = "tournament"` | New |
| View entrant list | All `tournamentEntries` for this tournament | New |
| View tournament's audit history | All `adminAuditLog` rows with `targetType = "tournament"`, `targetId = this id` | New |
| Approve/reject cancel request | Post-start cancellation | Speced — admin model spec §3.2 |
| Approve/reject disqualify request | Speced | admin model spec §3.2 |
| Approve/reject result-change request | Speced | admin model spec §3.2 |
| Force-cancel pre-start (admin override) | Organizer self-cancel already exists pre-start with no approval needed; this is an admin-initiated version for abuse/fraud cases where the organizer won't or can't act | **Needs decision** |
| Unpublish / hide a tournament | Pull a tournament from public listing without cancelling it (e.g. under investigation) | **Needs decision** — no draft/visibility state exists in the schema yet |

---

## 9. Tournament Entries

| Action | What it does | Status |
|---|---|---|
| View entry detail | Fee paid, placement, disqualification status | New (mostly surfaced via tournament detail) |
| Disqualify via organizer request | Organizer files, admin approves — Section 3 flow | Speced — admin model spec §3 |
| Direct admin disqualification | Admin disqualifies without waiting on an organizer request (e.g. platform-detected cheating) | **Needs decision** — does this bypass the request/approve pattern, or does the admin just "request and approve" in one action? |
| Manually edit final placement | Admin-direct override, distinct from the organizer-requested `change_result` flow | **Needs decision** — should probably route through the same `tournamentActionRequests` table with the admin as both requester and approver, for a consistent audit shape, rather than a separate ad hoc edit path |

---

## 10. Tournament Prizes

| Action | What it does | Status |
|---|---|---|
| List by tournament | Filter by status (pending/disbursed/unawarded) | New |
| View prize detail | Placement, amount, status, reason if unawarded | New |
| Record unawarded reason | Organizer or admin, precondition for release | Speced — admin model spec §4.2 |
| Release to platform pool | Admin-only, requires reason already recorded, funds go to `PLATFORM_ACCOUNT_ID` never the organizer | Speced |
| View release history for a prize | Ledger trail for this specific prize row | New |

---

## 11. Tournament Action Requests

| Action | What it does | Status |
|---|---|---|
| List / filter | By status, tournament, request type | Speced — admin model spec §3.2 |
| View request detail | Reason, evidence, proposed changes | Speced |
| Approve | Executes the underlying action (cancel/disqualify/change-result) | Speced |
| Reject | No state change beyond the request row itself | Speced |

---

## 12. Admin Audit Log

| Action | What it does | Status |
|---|---|---|
| View / search | Filter by admin, target type/id, action type, date range | Speced — admin model spec §5 |
| Export | Compliance export over a date range | New |
| Edit / delete | — | **Explicitly not offered.** Insert-only by design; this is the record of record and must stay tamper-evident. |

---

## 13. Platform Account (system ledger user, `PLATFORM_ACCOUNT_ID`)

| Action | What it does | Status |
|---|---|---|
| View current balance | `getBalance(PLATFORM_ACCOUNT_ID, "available")` | Speced — admin model spec §5 |
| View full transaction history | Every ledger row for the platform account | New |
| Breakdown report | Sum by `entryType` and date range — e.g. total `platform_fee` vs total `prize_pool_refund` this month | New |
| Withdraw platform revenue externally | Moving accumulated fees out of the ledger into a real bank/mobile-money account | **Needs decision** — this is likely a manual finance/ops process outside the app rather than an in-app "withdraw" button; confirm with the team before building anything here |

---

## 14. Admin Users / Roles (meta-admin — not covered anywhere else)

This is the one node with genuinely nothing specified yet. The current `role` enum on `users` is flat: `player | organizer | admin`. That means any admin can currently do everything in this document, including the highest-risk actions (manual balance adjustment, dispute voiding, prize pool release). Worth raising with the team before this goes further:

| Action | What it does | Status |
|---|---|---|
| List admins | Who currently has `role = "admin"` | New (trivial once decided) |
| Promote a user to admin | — | **Needs decision** — who can promote an admin? Presumably not another regular admin through the same UI everyone else uses |
| Demote/revoke admin role | — | **Needs decision** |
| Scoped admin roles (e.g. support vs. finance vs. super-admin) | Restrict who can do manual balance adjustments / dispute resolution vs. who can only view | **Needs decision** — flagged because several actions above (manual balance adjustment, prize release, dispute voiding) are money-moving and probably shouldn't be available to every admin by default |
| Two-admin approval on high-risk actions | Require a second admin to co-sign manual adjustments or large voids | **Needs decision** |

---

## Summary — What's Ready to Build Now vs. What Needs an Answer First

**Ready (Speced or New, no open question):** everything in sections 1 (except 1.1), 2 (except lockout override), 3–13 except the rows explicitly marked "Needs decision."

**Blocked on a decision before building:**
1. Manual ledger balance adjustment (1.1 / Section 5)
2. Account suspension / reactivation
3. Session revocation
4. Manual role change outside the organizer application flow
5. Phone number unlink/reset
6. OTP lockout override
7. Organizer status revocation post-approval
8. Force-cancel a stuck match
9. Admin-initiated pre-start tournament cancellation
10. Tournament unpublish/visibility state
11. Direct admin disqualification vs. request/approve
12. Direct placement edit vs. request/approve
13. Platform revenue withdrawal
14. Admin role management and scoping (arguably the most important gap, since it governs who's allowed to do items 1–13)

Recommend getting answers on #14 before the others — it determines whether items 1, 8, 9, 11, 12, and 13 need permission gating beyond the current flat `role === "admin"` check.
