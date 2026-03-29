"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFilterStore } from "@/stores/filterStore";
import client from "@/lib/sanity/client";
import { groq } from "next-sanity";

type SearchSuggestion = {
  type: "brand" | "model" | "recent";
  text: string;
  count?: number;
};

const MAX_SUGGESTIONS = 8;

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useFilterStore();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isMobileOverlayOpen, setIsMobileOverlayOpen] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get recent searches from localStorage (by IP/user)
  const getRecentSearches = (): string[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("recentSearches");
      return stored ? JSON.parse(stored).slice(0, 3) : [];
    } catch (error) {
      // Handle localStorage errors (quota exceeded, disabled, etc.)
      console.warn("Error reading from localStorage:", error);
      return [];
    }
  };

  // Save search to recent searches
  const saveRecentSearch = (query: string) => {
    if (typeof window === "undefined" || !query.trim()) return;
    try {
      const recent = getRecentSearches();
      const updated = [query, ...recent.filter((s) => s !== query)].slice(0, 10);
      localStorage.setItem("recentSearches", JSON.stringify(updated));
    } catch (error) {
      // Handle localStorage errors (quota exceeded, disabled, etc.)
      console.warn("Error writing to localStorage:", error);
    }
  };

  // Fetch search suggestions from Sanity
  useEffect(() => {
    if (!localSearch.trim() || !isFocused) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;

    async function fetchSuggestions() {
      if (!client) {
        // Mock suggestions when Sanity not configured
        const mockSuggestions: SearchSuggestion[] = [
          { type: "brand", text: "BMW", count: 1234 },
          { type: "brand", text: "Mercedes-Benz", count: 987 },
          { type: "model", text: "Model X", count: 456 },
        ];
        if (!cancelled) {
          setSuggestions(mockSuggestions);
        }
        return;
      }

      try {
        const query = localSearch.toLowerCase();
        const searchPattern = `*${query}*`;

        // Search brands and series (from Vehicle Series in Sanity)
        const suggestionsQuery = groq`
          {
            "brands": *[_type == "vehicleSeries" && defined(brand) && brand->title match $pattern] | order(title asc) [0...5] {
              "brand": brand->title
            },
            "series": *[_type == "vehicleSeries" && title match $pattern] | order(title asc) [0...5] {
              title,
              "brand": brand->title
            }
          }
        `;

        const data = await client.fetch<{
          brands: { brand: string | null }[];
          series: { title: string; brand: string | null }[];
        }>(suggestionsQuery, { pattern: searchPattern });

        if (cancelled) return;

        const suggestionList: SearchSuggestion[] = [];

        // Add unique brands
        const uniqueBrands = Array.from(
          new Set(
            data.brands.map((b) => b.brand).filter((b): b is string => !!b),
          ),
        ).slice(0, 4);
        uniqueBrands.forEach((brand) => {
          suggestionList.push({ type: "brand", text: brand });
        });

        // Add unique series (title + brand)
        const uniqueSeries = Array.from(
          new Set(
            data.series.map((s) =>
              s.brand ? `${s.brand} ${s.title}` : s.title,
            ),
          ),
        ).slice(0, 4);
        uniqueSeries.forEach((text) => {
          suggestionList.push({ type: "model", text });
        });

        // Add recent searches if query is empty or matches
        if (query.length === 0 || suggestionList.length < MAX_SUGGESTIONS) {
          const recent = getRecentSearches();
          recent.forEach((recent) => {
            if (
              suggestionList.length < MAX_SUGGESTIONS &&
              !suggestionList.some((s) => s.text === recent)
            ) {
              suggestionList.push({ type: "recent", text: recent });
            }
          });
        }

        setSuggestions(suggestionList.slice(0, MAX_SUGGESTIONS));
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        if (!cancelled) setSuggestions([]);
      }
    }

    const timeoutId = setTimeout(fetchSuggestions, 200);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [localSearch, isFocused]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      saveRecentSearch(localSearch.trim());
      setSearchQuery(localSearch.trim());
    }
    setShowSuggestions(false);
    setIsFocused(false);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setLocalSearch(suggestion.text);
    saveRecentSearch(suggestion.text);
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setLocalSearch("");
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const openMobileOverlayIfNeeded = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileOverlayOpen(true);
    }
  };

  const closeMobileOverlay = () => {
    setIsMobileOverlayOpen(false);
    setShowSuggestions(false);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  // Mobile full-screen overlay search
  if (isMobileOverlayOpen) {
    return (
      <div className="md:hidden">
        <div className="fixed inset-0 z-[60] bg-white pt-[env(safe-area-inset-top)]">
          <form
            onSubmit={handleSearch}
            ref={searchRef}
            className="px-3 pt-3 pb-2 border-b border-[var(--border)] flex items-center gap-2"
          >
            <button
              type="button"
              onClick={closeMobileOverlay}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close search"
            >
              <X className="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
            <div className="flex-1 relative">
              <Search
                className={`absolute left-3 h-4 w-4 transition-colors ${
                  isFocused
                    ? "text-[var(--primary)]"
                    : "text-[var(--text-tertiary)]"
                } pointer-events-none`}
                aria-hidden
              />
              <input
                ref={inputRef}
                type="search"
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  setIsFocused(true);
                  setShowSuggestions(true);
                }}
                placeholder="Search vehicles..."
                className="w-full pl-9 pr-4 py-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] bg-transparent border-0 outline-none focus:outline-none"
                aria-label="Search vehicles"
                autoFocus
              />
            </div>
            {localSearch && (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-[var(--text-tertiary)]" />
              </button>
            )}
          </form>

          <div className="px-3 pb-[env(safe-area-inset-bottom)] pt-2 overflow-y-auto max-h-[calc(100vh-env(safe-area-inset-top)-56px)]">
            {showSuggestions &&
              (suggestions.length > 0 || localSearch.trim() === "") && (
                <>
                  {suggestions.length > 0 ? (
                    <div className="space-y-1">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={`${suggestion.type}-${suggestion.text}-${idx}`}
                          type="button"
                          onClick={() => {
                            handleSuggestionClick(suggestion);
                            closeMobileOverlay();
                          }}
                          className="w-full px-2 py-3 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between group rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <Search className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--primary)] transition-colors" />
                            <span className="text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                              {suggestion.text}
                            </span>
                            {suggestion.type === "recent" && (
                              <span className="text-xs text-[var(--text-tertiary)]">
                                Recent
                              </span>
                            )}
                          </div>
                          {suggestion.count !== undefined && (
                            <span className="text-xs text-[var(--text-tertiary)]">
                              {suggestion.count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-2 py-3 text-sm text-[var(--text-tertiary)]">
                      Start typing to search...
                    </div>
                  )}
                </>
              )}
          </div>
        </div>
      </div>
    );
  }

  // Default inline search (desktop + mobile trigger) — 100% of available space
  return (
    <form
      onSubmit={handleSearch}
      className="flex-1 min-w-0 mx-2 md:mx-4"
      ref={searchRef}
    >
      <div className="relative">
        <div
          className={`relative flex items-center rounded-lg border transition-all duration-200 ${
            isFocused
              ? "border-[var(--primary)] shadow-lg shadow-[var(--primary)]/20"
              : "border-[var(--border)] hover:border-[var(--primary)]/50"
          } bg-white`}
        >
          <Search
            className={`absolute left-3 md:left-4 h-4 w-4 transition-colors ${
              isFocused
                ? "text-[var(--primary)]"
                : "text-[var(--text-tertiary)]"
            } pointer-events-none`}
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              setIsFocused(true);
              setShowSuggestions(true);
              openMobileOverlayIfNeeded();
            }}
            onBlur={() => {
              // Delay to allow suggestion clicks (desktop)
              setTimeout(() => setIsFocused(false), 200);
            }}
            placeholder="Search vehicles..."
            className="w-full pl-9 md:pl-11 pr-20 md:pr-24 py-2 md:py-3 text-xs md:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] bg-transparent border-0 outline-none focus:outline-none"
            aria-label="Search vehicles"
          />
          <div className="absolute right-2 flex items-center gap-1">
            {localSearch && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-[var(--text-tertiary)]" />
              </button>
            )}
            <button
              type="submit"
              className={`px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all duration-200 ${
                isFocused || localSearch
                  ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-md hover:shadow-lg"
                  : "bg-gray-100 text-[var(--text-secondary)] hover:bg-gray-200"
              }`}
            >
              <span className="hidden sm:inline">Search</span>
              <Search className="h-4 w-4 sm:hidden" />
            </button>
          </div>
        </div>

        {/* Desktop suggestions dropdown */}
        {showSuggestions &&
          (suggestions.length > 0 || localSearch.trim() === "") && (
            <div className="hidden md:block absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border)] rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
              {suggestions.length > 0 ? (
                <div className="py-2">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={`${suggestion.type}-${suggestion.text}-${idx}`}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <Search className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--primary)] transition-colors" />
                        <span className="text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                          {suggestion.text}
                        </span>
                        {suggestion.type === "recent" && (
                          <span className="text-xs text-[var(--text-tertiary)]">
                            Recent
                          </span>
                        )}
                      </div>
                      {suggestion.count !== undefined && (
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {suggestion.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-[var(--text-tertiary)]">
                  Start typing to search...
                </div>
              )}
            </div>
          )}
      </div>
    </form>
  );
}
