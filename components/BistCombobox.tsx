"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BIST_COMPANIES, BIST_30_TICKERS, normalizeTurkish, type BistCompany } from "@/lib/bist";

interface BistComboboxProps {
  placeholder?: string;
  className?: string;
  compact?: boolean;
  autoNavigate?: boolean;
  onSelect?: (company: BistCompany) => void;
  selectedTicker?: string;
}

export default function BistCombobox({
  placeholder = "BIST şirket ara (kod veya ad: THYAO, Garanti, Ereğli...)",
  className = "",
  compact = false,
  autoNavigate = true,
  onSelect,
  selectedTicker,
}: BistComboboxProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const comboboxId = useId();

  // Find currently selected company if prop provided
  const initialCompany = useMemo(() => {
    if (!selectedTicker) return null;
    const clean = selectedTicker.toUpperCase();
    return (
      BIST_COMPANIES.find(
        (c) => c.ticker.toUpperCase() === clean || c.code.toUpperCase() === clean
      ) ?? null
    );
  }, [selectedTicker]);

  // Filter companies based on query
  const filtered = useMemo(() => {
    const q = normalizeTurkish(query);
    if (!q) {
      // Return popular BIST 30 tickers when empty
      return BIST_30_TICKERS.map((t) =>
        BIST_COMPANIES.find((c) => c.ticker === t)
      ).filter((c): c is BistCompany => Boolean(c));
    }

    const exactCodes: BistCompany[] = [];
    const prefixCodes: BistCompany[] = [];
    const prefixNames: BistCompany[] = [];
    const containsMatches: BistCompany[] = [];

    for (const c of BIST_COMPANIES) {
      const codeNorm = normalizeTurkish(c.code);
      const nameNorm = normalizeTurkish(c.name);

      if (codeNorm === q) {
        exactCodes.push(c);
      } else if (codeNorm.startsWith(q)) {
        prefixCodes.push(c);
      } else if (nameNorm.startsWith(q)) {
        prefixNames.push(c);
      } else if (codeNorm.includes(q) || nameNorm.includes(q)) {
        containsMatches.push(c);
      }

      if (
        exactCodes.length +
          prefixCodes.length +
          prefixNames.length +
          containsMatches.length >=
        50
      ) {
        break;
      }
    }

    return [...exactCodes, ...prefixCodes, ...prefixNames, ...containsMatches].slice(0, 30);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global hotkey Ctrl+K or / to focus combobox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA")
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Keep active index in bounds
  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const handleSelect = (company: BistCompany) => {
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);

    if (onSelect) {
      onSelect(company);
    }

    if (autoNavigate) {
      router.push(`/symbol/${encodeURIComponent(company.ticker)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        return;
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < filtered.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : filtered.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        handleSelect(filtered[activeIndex]);
      } else if (filtered.length > 0) {
        handleSelect(filtered[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      id={`combobox-${comboboxId}`}
    >
      <div className="relative flex items-center">
        {/* Search Icon */}
        <span className="pointer-events-none absolute left-3 text-zinc-400">
          <svg
            className={compact ? "h-4 w-4" : "h-5 w-5"}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className={`w-full rounded-xl border border-zinc-800 bg-zinc-900/90 text-zinc-100 placeholder-zinc-500 shadow-inner backdrop-blur transition focus:border-sky-500/80 focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
            compact
              ? "py-1.5 pl-9 pr-16 text-xs"
              : "py-3 pl-11 pr-24 text-sm md:text-base"
          }`}
        />

        {/* Right side controls: Clear & Shortcut badge */}
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              title="Temizle"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ) : (
            <kbd className="hidden select-none items-center gap-0.5 rounded border border-zinc-700/80 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline-flex">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/95 p-1.5 shadow-2xl backdrop-blur-md">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {query.trim() ? (
              <span>
                Bulunan Şirketler ({filtered.length})
              </span>
            ) : (
              <span>Popüler BIST Şirketleri ({filtered.length})</span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              <p className="font-medium text-zinc-400">Sonuç bulunamadı</p>
              <p className="mt-1 text-xs text-zinc-600">
                &ldquo;{query}&rdquo; için eşleşen BIST şirketi bulunamadı.
              </p>
            </div>
          ) : (
            <ul ref={listRef} className="space-y-1">
              {filtered.map((company, index) => {
                const isSelected =
                  initialCompany?.code === company.code ||
                  selectedTicker === company.ticker;
                const isActive = activeIndex === index;

                return (
                  <li
                    key={company.ticker}
                    onClick={() => handleSelect(company)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                      isActive
                        ? "bg-sky-600/20 text-sky-100"
                        : "text-zinc-200 hover:bg-zinc-800/60"
                    } ${isSelected ? "border-l-2 border-sky-400" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="inline-flex shrink-0 items-center rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-sky-300 group-hover:border-sky-400/50">
                        {company.code}
                      </span>
                      <span className="truncate text-xs font-medium text-zinc-200 group-hover:text-zinc-100 md:text-sm">
                        {company.name}
                      </span>
                    </div>

                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      {company.city && (
                        <span className="hidden text-[11px] text-zinc-500 sm:inline-block">
                          {company.city}
                        </span>
                      )}
                      <span className="text-xs text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-sky-400">
                        Detay →
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-zinc-800/80 px-3 py-1.5 text-[11px] text-zinc-500 flex justify-between items-center">
            <span>Toplam 800+ BIST şirketi kayıtlı</span>
            <span className="text-[10px] text-zinc-600">Seçmek için [Enter]</span>
          </div>
        </div>
      )}
    </div>
  );
}
