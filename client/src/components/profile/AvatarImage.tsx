import { AVATAR_MAP } from "@/services/profile/avatarMap";
import type { AvatarKey } from "@/services/profile/avatarMap";

const SIZE_CLASSES: Record<string, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  default: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
};

interface AvatarImageProps {
  avatarKey: AvatarKey;
  size?: "sm" | "md" | "default" | "lg" | "xl";
  className?: string;
  displayName?: string;
}

export function AvatarImage({
  avatarKey,
  size = "default",
  className = "",
  displayName,
}: AvatarImageProps) {
  const entry = AVATAR_MAP[avatarKey] ?? AVATAR_MAP["default"];
  const sizeClass = SIZE_CLASSES[size] ?? SIZE_CLASSES["default"];

  return (
    <img
      src={entry.src}
      alt={displayName ?? ""}
      className={`rounded-full object-cover flex-shrink-0 ${sizeClass} ${className}`}
    />
  );
}
