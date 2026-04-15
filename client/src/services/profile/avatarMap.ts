import type { components } from "@/types/api.generated";
import defaultSvg from "@/assets/avatars/default.svg";
import pink1Svg from "@/assets/avatars/pink_1.svg";
import pink2Svg from "@/assets/avatars/pink_2.svg";
import pink3Svg from "@/assets/avatars/pink_3.svg";
import pink4Svg from "@/assets/avatars/pink_4.svg";
import dark1Svg from "@/assets/avatars/dark_1.svg";
import dark2Svg from "@/assets/avatars/dark_2.svg";
import dark3Svg from "@/assets/avatars/dark_3.svg";
import accent1Svg from "@/assets/avatars/accent_1.svg";
import accent2Svg from "@/assets/avatars/accent_2.svg";

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
  "accent_1",
  "accent_2",
];

export const AVATAR_MAP: Record<AvatarKey, { src: string; label: string }> = {
  default: { src: defaultSvg, label: "Default avatar" },
  pink_1: { src: pink1Svg, label: "Pink triangle avatar" },
  pink_2: { src: pink2Svg, label: "Pink square avatar" },
  pink_3: { src: pink3Svg, label: "Pink rings avatar" },
  pink_4: { src: pink4Svg, label: "Pink hexagon avatar" },
  dark_1: { src: dark1Svg, label: "Dark violet triangle avatar" },
  dark_2: { src: dark2Svg, label: "Dark violet square avatar" },
  dark_3: { src: dark3Svg, label: "Dark violet rings avatar" },
  accent_1: { src: accent1Svg, label: "Gold triangle avatar" },
  accent_2: { src: accent2Svg, label: "Gold hexagon avatar" },
};
