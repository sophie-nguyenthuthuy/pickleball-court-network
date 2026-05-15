# ADR 0003 — Glicko-2 for amateur ratings

- Status: accepted
- Date: 2026-05-15

## Context

Vietnamese amateur pickleball is highly sporadic; players might log 3 matches one weekend, then nothing for two months. Plain ELO is well-known to be noisy with low match volume and gives newcomers wide rating swings on small samples, which kills enthusiasm.

## Decision

Use Glicko-2 (Glickman, 2012). Per-player state is `(rating, rd, volatility)` — wide RD for new / inactive players means the system updates them more aggressively when there's information to learn, and barely at all otherwise.

Display rating mapped onto the DUPR-style 2.0–7.0 band for player familiarity.

## Consequences

- Rating recompute runs per rating period (weekly) batch-style rather than per-match. That's a worker job, not an API path.
- We store `(rating, deviation, volatility)` per `(user, sport, format)` so a player can be 3.5 in singles and 4.0 in doubles.
- New players start at 1500 / 350 RD / 0.06 volatility per the Glickman defaults.

## Alternatives considered

- **DUPR direct integration.** DUPR's API is opaque and licensing is unclear in VN as of 2026-05. Mirror the *scale*, not the *system*, for now.
- **TrueSkill (Microsoft).** Excellent for team games with hidden skill, but its priors don't match the doubles-heavy pickleball amateur scene as well.
