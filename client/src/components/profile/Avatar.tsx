import { AvatarImage } from "@/components/profile/AvatarImage";
import { AVATAR_KEYS } from "@/services/profile/avatarMap";
import type { AvatarKey } from "@/services/profile/avatarMap";

interface AvatarUser {
  avatar_key?: string | null;
  display_name?: string | null;
}

interface AvatarProps {
  user: AvatarUser;
  size?: "sm" | "md" | "default" | "lg" | "xl";
  className?: string;
}

function toAvatarKey(raw: string | null | undefined): AvatarKey {
  if (raw && (AVATAR_KEYS as string[]).includes(raw)) {
    return raw as AvatarKey;
  }
  return "default";
}

export function Avatar({ user, size, className }: AvatarProps) {
  return (
    <AvatarImage
      avatarKey={toAvatarKey(user.avatar_key)}
      size={size}
      className={className}
      displayName={user.display_name ?? undefined}
    />
  );
}
