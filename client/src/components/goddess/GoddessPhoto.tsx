const FALLBACK_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E";

type Variant = "hero" | "portrait" | "accent" | "card";

interface GoddessPhotoProps {
  variant: Variant;
  alt?: string;
  className?: string;
}

const VARIANT_DEFAULTS: Record<Variant, string> = {
  hero: "Your Goddess",
  portrait: "Goddess portrait",
  accent: "Goddess",
  card: "Goddess card",
};

function resolveVariantSrc(variant: Variant): string {
  const filename = `goddess-${variant}.webp`;
  return new URL(`../../assets/goddess/${filename}`, import.meta.url).href;
}

function handleImageError(event: React.SyntheticEvent<HTMLImageElement>): void {
  const img = event.currentTarget;
  if (img.src !== FALLBACK_SRC) {
    img.src = FALLBACK_SRC;
  }
}

export function GoddessPhoto({ variant, alt, className }: GoddessPhotoProps) {
  const src = resolveVariantSrc(variant);
  const resolvedAlt = alt ?? VARIANT_DEFAULTS[variant];

  return (
    <img
      src={src}
      alt={resolvedAlt}
      loading="lazy"
      onError={handleImageError}
      className={`w-full h-auto object-cover${className ? ` ${className}` : ""}`}
    />
  );
}
