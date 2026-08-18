# Escrow System — Implementation Checklist

Use this to verify the build covers both the original happy-path design and the edge-case decisions from the team. Organized to match the two escrow types plus admin controls.

---

## 1. Core Ledger / Balance Model

- [ ] Every user account has two tracked balances: `available` and `escrow`
- [ ] Moving funds into escrow debits `available`, credits `escrow` (never a silent delete/create)
- [ ] Moving funds out of escrow debits `escrow`, credits `available` (or facilitator's `available`, as applicable)
- [ ] Every escrow entry is tied to a specific reference id (match id or tournament id) — no "unlabeled" escrow
- [ ] Ledger movements are logged/immutable (append-only transaction history, not just a balance overwrite)

---

## 2. Wager Match Escrow

### Happy path
- [ ] Player A creates match, sets wager amount, wager moves `available → escrow`
- [ ] Player B joins, matches wager, same debit/credit applied
- [ ] Match completion calculates platform fee off the full pot
- [ ] Winner receives `pot − platform fee` into their `available` balance
- [ ] Platform fee amount is recorded/tracked (not just silently dropped)
- [ ] Platform fee % is read from the admin-configured per-game-type setting (not hardcoded)

### Draw
- [ ] Draw result type exists distinct from win/loss
- [ ] Both players get equal participation marbles on a draw
- [ ] Rating logic applies either "no change" or the normal draw formula (confirm which was chosen and implement consistently)
- [ ] Draw pot settlement path is defined explicitly (confirm with team exactly how the pot resolves on a draw, since this wasn't spelled out numerically)

### Disconnection
- [ ] 90-second reconnection timer starts on disconnect
- [ ] Board state is preserved (not reset/abandoned) during the window
- [ ] Disconnected player's game clock pauses during the window (opponent's clock behavior confirmed too)
- [ ] If player reconnects in time, match resumes normally
- [ ] If player does not reconnect, opponent can claim a win — is this automatic or does opponent have to explicitly claim it?
- [ ] If both players disconnect, match is marked `abandoned` (distinct status from win/loss/draw)
- [ ] Abandoned match escrow/pot handling is defined (does the pot return to both players, or something else?)

### Unjoined Match
- [ ] Player A can manually cancel an unjoined match with zero penalty
- [ ] Cancellation returns wager to `available` immediately
- [ ] Room auto-expires after 10 minutes if no manual cancellation
- [ ] Auto-expiry triggers the same no-penalty refund path
- [ ] No match record is created for unjoined/expired matches
- [ ] No reward/marbles/rating changes occur for unjoined/expired matches

### Disputes
- [ ] Admin has a "place under review" action on a completed match result
- [ ] "Under review" freezes both the settlement result and any achievement rewards tied to it
- [ ] Move logs are retained and queryable for a match under dispute
- [ ] Timestamps are retained for a match under dispute
- [ ] Connection/reconnection records are retained for a match under dispute
- [ ] Admin can resolve a review three ways: confirm, correct, or void
- [ ] Each of confirm/correct/void has defined ledger consequences (e.g., void triggers refund, correct triggers re-settlement)
- [ ] Every admin action on a disputed match writes to a permanent audit log (actor, action, timestamp, before/after state)

---

## 3. Tournament Prize Escrow

### Happy path
- [ ] Facilitator creates tournament with prize structure (1st, 2nd, etc.)
- [ ] Full prize pool is locked in escrow **at creation time**, not later
- [ ] Tournament creation is blocked if facilitator's `available` balance can't cover the full prize pool
- [ ] Entry fees (if any) are tracked as a **separate** escrow entry from the prize pool, same tournament id
- [ ] Entry fee escrow and prize escrow never get merged into one ledger row
- [ ] On confirmed completion, prize escrow disburses to winners' `available` balances
- [ ] On confirmed completion, entry fee escrow moves to facilitator's `available` balance (their revenue)

### Facilitator Cancellation
- [ ] Facilitator (or admin, post-start — see Admin Controls) can cancel a tournament
- [ ] Cancellation auto-returns prize pool to facilitator's `available` balance
- [ ] Cancellation auto-returns each paid entry fee to the respective player's `available` balance
- [ ] A 5% cancellation fee is calculated against the **total tournament fee** and deducted as part of settlement
- [ ] Confirm precisely what "total tournament fee" means numerically (sum of entry fees collected? prize pool? both?) before hardcoding the 5% base

### Payout
- [ ] Before payout execution, system re-verifies facilitator has sufficient seated funds
- [ ] Payout only proceeds after verification passes
- [ ] Payout amounts/recipients follow the payout structure that was locked in at/before tournament commencement (not editable post-hoc without admin approval — see Admin Controls)
- [ ] Platform executes the disbursement (not a manual/facilitator-triggered transfer)

### Tournament Does Not Fill
- [ ] Minimum viable player count is a required, published field at tournament creation
- [ ] System checks current registrations against minimum at the registration deadline
- [ ] If minimum is met (but tournament isn't full), facilitator gets a "resize" action to shrink the tournament
- [ ] Resize action correctly adjusts bracket/structure without breaking escrow accounting
- [ ] If minimum is not met, tournament auto-cancels at the deadline
- [ ] Auto-cancellation follows the same refund path as Facilitator Cancellation (confirm whether the 5% fee applies here too, or only to manual cancellations)

### Platform Fee
- [ ] 10% platform fee is applied at tournament **commencement** (not creation, not completion)
- [ ] Fee base is defined (confirm: 10% of entry fees collected, of prize pool, or both — spec says "platform fee" without specifying base)
- [ ] Fee is deducted/recorded in the ledger as a distinct transaction, not folded silently into another entry

### Unawarded Placements
- [ ] A placement can be flagged "unawarded" with a required reason field
- [ ] Reason must be recorded by organiser or admin before the escrow unlocks
- [ ] Until reason is recorded, remaining reward stays locked in escrow (not auto-released to anyone)
- [ ] After confirmation, unused marbles route to the **platform reward pool**
- [ ] Explicitly blocked: unused marbles auto-crediting to the facilitator

### Disqualification
- [ ] Disqualification action requires a reason field
- [ ] Disqualification action requires evidence attachment/reference
- [ ] System checks published tournament rules for "next eligible player" reassignment permission
- [ ] If allowed, placement/prize reassigns to next eligible player automatically (or via admin trigger — confirm which)
- [ ] If not allowed, placement falls through to the Unawarded Placements flow above

---

## 4. Admin Controls

### Limits configuration
- [ ] Admin can set, per game type: min wager, max wager
- [ ] Admin can set, per game type: min tournament entry fee, max entry fee
- [ ] Admin can set, per game type: min prize pool, max prize pool
- [ ] Admin can set platform fee percentage(s) — confirm if wager fee % and tournament fee % are separate settings
- [ ] All limits are validated **at creation time** — out-of-range requests are rejected immediately, not flagged after the fact
- [ ] Changing a limit does **not** retroactively affect existing matches/tournaments created under the old limit

### Administrative review / approval gates
- [ ] Cancelling a tournament **after it has started** requires admin approval (not facilitator self-serve)
- [ ] Disqualification actions require admin approval
- [ ] Any change to a **confirmed** result requires admin approval
- [ ] All of the above write to a permanent, queryable audit log (who, what, when, before/after)
- [ ] Audit log is append-only / tamper-evident (not just a mutable "notes" field)

---

## 5. Cross-Cutting / Easy-to-Miss Items

- [ ] Match/tournament status enums include the new states: `abandoned`, `under_review`, `unawarded`, `disqualified`, `resized`, `auto_expired` (add whichever your schema doesn't already have)
- [ ] All new refund/settlement paths (draw, disconnection, unjoined, cancellation, underfill) are covered by tests, not just the win/loss happy path
- [ ] Audit log schema is shared/consistent across both wager disputes and tournament admin actions rather than two separate implementations
- [ ] Currency/marble rounding rules are consistent across fee calculations (5% cancellation fee, 10% platform fee, pot splits)

---

**Two things still worth pinning down explicitly before you close this out** (flagged during the decisions pass, not fully resolved above):
1. Exact numeric base for the 5% tournament cancellation fee.
2. Exact numeric base for the 10% tournament platform fee (entry fees vs. prize pool vs. both).
