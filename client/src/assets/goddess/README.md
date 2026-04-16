# goddess/ — brand art assets

Drop four WEBP files here. The `GoddessPhoto` component resolves them at runtime
via `new URL(...)` so a missing file degrades to a transparent 1×1 placeholder
rather than breaking the build.

| File name               | Variant    | Usage context                              |
| ----------------------- | ---------- | ------------------------------------------ |
| `goddess-hero.webp`     | `hero`     | Full-width banner / landing hero section   |
| `goddess-portrait.webp` | `portrait` | Square or tall portrait, sidebar / profile |
| `goddess-accent.webp`   | `accent`   | Small decorative accent image              |
| `goddess-card.webp`     | `card`     | Card thumbnail, invitation surface         |

Files are gitignored by the root `.gitignore` wildcard for binary assets — add
them locally and supply them through your deployment pipeline.
