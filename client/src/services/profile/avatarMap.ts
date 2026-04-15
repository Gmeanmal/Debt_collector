import type { components } from "@/types/api.generated";
import defaultPng from "@/assets/avatars/default.png";
import pink1Png from "@/assets/avatars/pink_1.png";
import pink2Png from "@/assets/avatars/pink_2.png";
import pink3Png from "@/assets/avatars/pink_3.png";
import pink4Png from "@/assets/avatars/pink_4.png";
import dark1Png from "@/assets/avatars/dark_1.png";
import dark2Png from "@/assets/avatars/dark_2.png";
import dark3Png from "@/assets/avatars/dark_3.png";

export type AvatarKey = components["schemas"]["AvatarKey"];

export const AVATAR_KEYS: AvatarKey[] = [
  "default",
  "pink_1",
  "pink_2",
  "pink_3",
  "pink_4",
  "dark_1",
  "dark_2",
  "dark_3",
];

export const AVATAR_MAP: Record<AvatarKey, { src: string; label: string }> = {
  default: { src: defaultPng, label: "Piggy bank" },
  pink_1: { src: pink1Png, label: "Open wallet" },
  pink_2: { src: pink2Png, label: "ATM" },
  pink_3: { src: pink3Png, label: "Broken credit card" },
  pink_4: { src: pink4Png, label: "Heart tag" },
  dark_1: { src: dark1Png, label: "Muzzled puppy" },
  dark_2: { src: dark2Png, label: "Heeled boot" },
  dark_3: { src: dark3Png, label: "Chastity lock" },
  accent_1: { src: defaultPng, label: "Piggy bank" },
  accent_2: { src: defaultPng, label: "Piggy bank" },
};
