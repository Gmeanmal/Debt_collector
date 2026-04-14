# Payment method icons

Drop brand logos for the tribute method registry here. Vite serves this
folder as-is, so they're reachable at `/payment-methods/<key>.svg`.

## Required filenames (exact keys — no spaces, no extension variations)

| Key            | File                 | Brand         |
| -------------- | -------------------- | ------------- |
| paypal         | `paypal.svg`         | PayPal        |
| throne         | `throne.svg`         | Throne        |
| cashapp        | `cashapp.svg`        | Cash App      |
| loyalfans      | `loyalfans.svg`      | LoyalFans     |
| onlyfans       | `onlyfans.svg`       | OnlyFans      |
| eth            | `eth.svg`            | Ethereum      |
| btc            | `btc.svg`            | Bitcoin       |
| tipfunder      | `tipfunder.svg`      | TipFunder     |
| amazon         | `amazon.svg`         | Amazon        |
| revolut        | `revolut.svg`        | Revolut       |
| wishtender     | `wishtender.svg`     | WishTender    |
| premium_chat   | `premium_chat.svg`   | Premium Chat  |
| sentbio        | `sentbio.svg`        | Sent.bio      |
| sumeria        | `sumeria.svg`        | Sumeria       |
| venmo          | `venmo.svg`          | Venmo         |

## Format guidelines

- **SVG preferred.** Crisp at any size, smallest bytes. PNG is accepted
  as a fallback — name it `<key>.png` and the code will pick it up when
  wired.
- **Square canvas**, roughly 64×64 viewBox. The icon component clips to
  a rounded square (`h-6 w-6` small, `h-8 w-8` medium), so a squarish
  logo looks best. Logos that are landscape (wide wordmarks) will look
  cramped — prefer the brand's "icon" variant, not the wordmark.
- **Solid background per brand.** Either bake the brand background into
  the SVG or provide a transparent logo on a brand-colored canvas. The
  current glyph badges use these hex values as reference:
  - paypal `#003087` / white
  - throne `#7c3aed` / white
  - cashapp `#00d54b` / black
  - loyalfans `#d3246c` / white
  - onlyfans `#00aff0` / white
  - eth `#627eea` / white
  - btc `#f7931a` / white
  - tipfunder `#ff4d6d` / white
  - amazon `#ff9900` / black
  - revolut `#0075eb` / white
  - wishtender `#ff6fa3` / white
  - premium_chat `#8b5cf6` / white
  - sentbio `#06b6d4` / white
  - sumeria `#e11d48` / white
  - venmo `#3d95ce` / white
- **No trademarks stripped.** Use official brand assets where available
  (press kits, brand pages). Do not rasterize and resize lossy images.

## How it's wired

`src/components/shared/tributeMethods/registry.ts` maps each `key` to
its canonical label. `MethodIcon` will prefer `/payment-methods/<key>.svg`
over the colored-glyph fallback once the files are in place.

Drop new brands here by:

1. Adding the file with the exact key-based name.
2. Adding an entry to `KNOWN_METHODS` in `registry.ts`.
3. Running the full test + lint suite before committing.
