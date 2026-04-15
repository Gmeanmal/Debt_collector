import { useRef } from "react";
import { AVATAR_KEYS, AVATAR_MAP } from "@/services/profile/avatarMap";
import type { AvatarKey } from "@/services/profile/avatarMap";

interface AvatarPickerProps {
  value: AvatarKey;
  onChange: (key: AvatarKey) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      next = (index + 1) % AVATAR_KEYS.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      next = (index - 1 + AVATAR_KEYS.length) % AVATAR_KEYS.length;
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(AVATAR_KEYS[index]);
      return;
    } else {
      return;
    }
    itemRefs.current[next]?.focus();
  }

  return (
    <div role="radiogroup" aria-label="Choose avatar" className="grid grid-cols-5 gap-2">
      {AVATAR_KEYS.map((key, i) => {
        const entry = AVATAR_MAP[key];
        const selected = value === key;
        return (
          <button
            key={key}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={entry.label}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(key)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`rounded-lg p-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-ring ${
              selected
                ? "ring-2 ring-pink-primary ring-offset-2 ring-offset-base-surface"
                : "ring-1 ring-base-border hover:ring-pink-primary/50"
            }`}
          >
            <img src={entry.src} alt={entry.label} className="h-16 w-16 rounded-md object-cover" />
          </button>
        );
      })}
    </div>
  );
}
