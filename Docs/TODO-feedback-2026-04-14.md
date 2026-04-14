# Feedback batch 2026-04-14

User request: implement all items, dev autonomously, note blockers.

## Items

| # | Item | Status | Commit | Blocker |
|---|------|--------|--------|---------|
| 1 | Modern date/time picker (replace native `datetime-local`) | done | b943cbc | — |
| 2 | Admin users table: filter by role + status | done | ff487eb | — |
| 3 | Hide UUIDs app-wide except for admin role | done | ff487eb | — |
| 4 | Sub profile: first_name / last_name / bio / avatar_url (editable) | done | 47f544d | — |
| 5 | Payment history: show source (sub-declared / goddess-requested / goddess-declared) | done | 6d30846 | — |
| 6 | Goddess "Manage subs" consolidated page (list → detail with rolling/contracts/late) | done | ff49cac | Late tab is placeholder "coming soon" |
| 7 | Goddess views: Weekly payments + Late subs | done | ff49cac | — |
| 8 | Sub dashboard: charts + 30-day rolling planning | done | dc4b7c7 | — |
| 9 | Contract simulation: total paid + stats (sub + dom perspectives) | done | 7ca1ad1 | — |

## Notes
- 2 and 3 bundled (same file).
- 4 requires backend migration (add `bio` column).
- 5 requires backend migration (add `source` enum column on payment_declaration).
- 6 is pure UI reshuffle over existing endpoints.
- 7 requires new goddess endpoints (weekly aggregation, late sub list).
- 8 needs recharts usage + new `/sub/planning` endpoint.
- 9 needs total_paid aggregate in contract detail DTO + UI.
