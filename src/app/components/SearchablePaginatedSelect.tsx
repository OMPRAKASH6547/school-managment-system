"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export type SearchableSelectItem = { value: string; label: string };

type SearchablePaginatedSelectProps = {
  items: SearchableSelectItem[];
  value: string;
  onChange: (value: string) => void;
  /** Shown on the closed control when nothing selected */
  emptyLabel: string;
  /** Debounce delay for filtering (ms) */
  debounceMs?: number;
  /** How many rows to render before loading more on scroll */
  pageSize?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
  /** Renders `<input type="hidden" name={formInputName} value={value} />` for native GET/POST forms */
  formInputName?: string;
  /** `dark` matches school sidebar (slate) styling */
  variant?: "default" | "dark";
};

/**
 * Dropdown with debounced search and incremental reveal (pageSize rows); scroll loads more.
 */
export function SearchablePaginatedSelect({
  items,
  value,
  onChange,
  emptyLabel,
  debounceMs = 300,
  pageSize = 15,
  required = false,
  disabled = false,
  className = "",
  id,
  "aria-label": ariaLabel,
  formInputName,
  variant = "default",
}: SearchablePaginatedSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, debounceMs);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [debouncedSearch]);

  const selectedLabel = useMemo(() => {
    const found = items.find((i) => i.value === value);
    return found?.label ?? "";
  }, [items, value]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, debouncedSearch]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [debouncedSearch, pageSize, items]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const onListScroll = useCallback(
    (e: React.UIEvent<HTMLUListElement>) => {
      const el = e.currentTarget;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 48) {
        setVisibleCount((c) => Math.min(c + pageSize, filtered.length));
      }
    },
    [filtered.length, pageSize],
  );

  function toggle() {
    if (disabled) return;
    setOpen((o) => !o);
    if (!open) {
      setSearch("");
    }
  }

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setSearch("");
  }

  const isDark = variant === "dark";
  const controlClass = isDark
    ? "mt-1 flex h-10 min-w-0 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-left text-xs text-slate-100 shadow-sm hover:bg-slate-750 disabled:opacity-50"
    : "input-field flex h-10 min-w-0 w-full cursor-pointer items-center justify-between gap-2 py-2 text-left text-sm disabled:opacity-50";

  const panelClass = isDark
    ? "absolute left-0 right-0 z-[60] mt-1 max-h-72 overflow-hidden rounded-lg border border-slate-600 bg-slate-900 shadow-xl"
    : "absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg";

  const searchWrapClass = isDark ? "border-b border-slate-700 p-2" : "border-b border-slate-100 p-2";

  const searchInputClass = isDark
    ? "h-9 w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
    : "input-field h-9 w-full py-1.5 text-sm";

  const listClass = "max-h-52 overflow-y-auto py-1";

  const itemBase = isDark
    ? "w-full px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
    : "w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50";

  const itemSelected = isDark ? "bg-primary-900/50 font-medium text-primary-100" : "bg-primary-50 font-medium text-primary-800";

  const emptyRowClass = isDark
    ? "w-full px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800"
    : "w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50";

  const chevronClass = isDark ? "shrink-0 text-slate-500" : "shrink-0 text-slate-400";

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      {formInputName != null && formInputName !== "" && (
        <input type="hidden" name={formInputName} value={value} readOnly />
      )}
      {required && (
        <input
          className="pointer-events-none absolute h-px w-px opacity-0"
          tabIndex={-1}
          aria-hidden
          value={value}
          required
          onChange={() => {}}
        />
      )}
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={controlClass}
        onClick={toggle}
      >
        <span className="truncate">{value ? selectedLabel || emptyLabel : emptyLabel}</span>
        <span className={chevronClass} aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className={panelClass} role="listbox">
          <div className={searchWrapClass}>
            <input
              type="search"
              className={searchInputClass}
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <ul ref={listRef} className={listClass} onScroll={onListScroll}>
            {!required && (
              <li>
                <button type="button" className={emptyRowClass} onClick={() => pick("")}>
                  {emptyLabel}
                </button>
              </li>
            )}
            {shown.map((item) => (
              <li key={item.value}>
                <button
                  type="button"
                  className={`${itemBase} ${item.value === value ? itemSelected : ""}`}
                  onClick={() => pick(item.value)}
                >
                  {item.label}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className={`px-3 py-3 text-center text-sm ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                No matches
              </li>
            )}
            {hasMore && (
              <li
                className={`px-3 py-2 text-center text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}
              >
                Scroll for more…
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Shared book / product category options */
export const BOOK_PRODUCT_CATEGORY_ITEMS: SearchableSelectItem[] = [
  { value: "book", label: "Book" },
  { value: "copy", label: "Copy" },
  { value: "stationery", label: "Stationery" },
];

/** active | inactive — shared by book products, classes, etc. */
export const ACTIVE_INACTIVE_STATUS_ITEMS: SearchableSelectItem[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const BOOK_PRODUCT_STATUS_ITEMS = ACTIVE_INACTIVE_STATUS_ITEMS;
