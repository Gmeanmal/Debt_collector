import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";

interface SearchableSelectProps<T> {
  options: T[];
  value: T | null;
  onChange: (v: T | null) => void;
  getLabel: (o: T) => string;
  getValue: (o: T) => string;
  placeholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  renderOption?: (o: T) => ReactNode;
  nullable?: boolean;
  triggerRef?: Ref<HTMLButtonElement>;
  ariaLabel?: string;
}

export function SearchableSelect<T>({
  options,
  value,
  onChange,
  getLabel,
  getValue,
  placeholder = "Select…",
  disabled = false,
  emptyMessage = "No options",
  renderOption,
  nullable = false,
  triggerRef,
  ariaLabel,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(-1);

  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((o) => getLabel(o).toLowerCase().includes(query.toLowerCase()));

  const activeDescendant =
    activeIdx >= 0 && activeIdx < filtered.length ? `${listboxId}-opt-${activeIdx}` : undefined;

  function openDropdown() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setActiveIdx(-1);
  }

  function closeDropdown() {
    setOpen(false);
    setQuery("");
    setActiveIdx(-1);
  }

  function selectOption(opt: T | null) {
    onChange(opt);
    closeDropdown();
  }

  function scrollOptionIntoView(idx: number) {
    const item = listRef.current?.children[idx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(activeIdx + 1, filtered.length - 1);
      setActiveIdx(next);
      scrollOptionIntoView(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.max(activeIdx - 1, -1);
      setActiveIdx(next);
      if (next >= 0) scrollOptionIntoView(next);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < filtered.length) {
        selectOption(filtered[activeIdx] ?? null);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
    } else if (e.key === "Tab") {
      closeDropdown();
    }
  }

  useEffect(() => {
    setActiveIdx(-1);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const triggerLabel = value ? getLabel(value) : placeholder;
  const hasValue = value !== null;

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
    },
    [onChange],
  );

  return (
    <div ref={rootRef} className="relative w-full">
      {/* Trigger / combobox button */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={openDropdown}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-[6px] border border-line bg-bg-elev px-4 py-2 text-sm transition-all duration-200",
          "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          hasValue ? "text-text" : "text-text-faint",
          open && "border-accent ring-2 ring-accent",
        )}
      >
        <span className="flex-1 truncate text-left">{triggerLabel}</span>
        <span className="flex items-center gap-1 shrink-0">
          {nullable && hasValue && (
            <span
              role="button"
              aria-label="Clear selection"
              onClick={handleClear}
              className="flex h-5 w-5 items-center justify-center rounded-full text-text-mute hover:text-text"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-faint transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-50 mt-1 w-full rounded-[10px] border border-line bg-bg-elev",
            "shadow-md divide-y divide-line",
          )}
        >
          {/* Filter input */}
          <div className="px-3 py-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type to search…"
              aria-label="Search options"
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-activedescendant={activeDescendant}
              className="w-full bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
            />
          </div>

          {/* Null / "applies to all" option */}
          {nullable && (
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              onClick={() => selectOption(null)}
              className={cn(
                "flex w-full items-center px-4 py-2.5 text-sm text-left transition-colors",
                "hover:bg-bg-sunken text-text-mute italic",
                value === null && "bg-bg-sunken text-accent-deep",
              )}
            >
              All subs (no override)
            </button>
          )}

          {/* Options listbox */}
          <ul ref={listRef} id={listboxId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-text-mute">{emptyMessage}</li>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = value !== null && getValue(opt) === getValue(value);
                const isActive = idx === activeIdx;
                return (
                  <li
                    key={getValue(opt)}
                    id={`${listboxId}-opt-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectOption(opt)}
                    className={cn(
                      "flex cursor-default items-center gap-3 px-4 py-2 text-sm transition-colors",
                      "hover:bg-bg-sunken",
                      isSelected && "text-accent-deep",
                      isActive && "bg-bg-sunken",
                    )}
                  >
                    {renderOption ? renderOption(opt) : getLabel(opt)}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
