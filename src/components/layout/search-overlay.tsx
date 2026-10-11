"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Clock, TrendingUp, ArrowUpRight } from "lucide-react";
import { CATEGORIES } from "@/lib/utils";

const RECENT_SEARCHES = [
  "Patek Philippe Nautilus",
  "Banksy original print",
  "Vintage Ferrari",
  "Hermès Birkin",
];

const POPULAR_SEARCHES = [
  "Luxury watches",
  "Contemporary art",
  "Classic cars",
  "Fine jewelry",
  "Rare whisky",
  "Sneakers",
  "Designer handbags",
  "Sports cards",
];

const MOCK_SUGGESTIONS = [
  { text: "Patek Philippe Nautilus 5711", category: "Watches" },
  { text: "Patek Philippe Aquanaut", category: "Watches" },
  { text: "Patek Philippe Calatrava", category: "Watches" },
  { text: "Porsche 911 Turbo S", category: "Cars" },
  { text: "Pablo Picasso Ceramics", category: "Art" },
  { text: "Panerai Luminor", category: "Watches" },
];

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = query.length > 0
    ? MOCK_SUGGESTIONS.filter((s) =>
        s.text.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setQuery("");
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative mx-auto mt-20 max-w-2xl px-4"
          >
            <div className="glass rounded-2xl border border-zinc-700/50 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 border-b border-zinc-800/50 px-5">
                <Search className="h-5 w-5 text-[#c8a44e] flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search luxury auctions..."
                  className="flex-1 bg-transparent py-4 text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                />
                {query.length > 0 && (
                  <button
                    onClick={() => setQuery("")}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-lg bg-zinc-800/80 px-2.5 py-1 text-xs font-medium text-zinc-400 border border-zinc-700/50"
                >
                  ESC
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto">
                {query.length > 0 ? (
                  <div className="p-2">
                    {filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800/60 transition-colors"
                        >
                          <Search className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                          <span className="flex-1 text-left">
                            {highlightMatch(suggestion.text, query)}
                          </span>
                          <span className="text-xs text-zinc-600">{suggestion.category}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600" />
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-8 text-center">
                        <p className="text-sm text-zinc-500">
                          No results found for &ldquo;{query}&rdquo;
                        </p>
                        <p className="mt-1 text-xs text-zinc-600">
                          Try a different search term
                        </p>
                      </div>
                    )}
                    <div className="mt-1 border-t border-zinc-800/50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                        Search in categories
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {CATEGORIES.slice(0, 6).map((category) => (
                          <button
                            key={category.id}
                            className="flex items-center gap-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-[#c8a44e] hover:border-[#c8a44e]/30 transition-colors"
                          >
                            <span>{category.icon}</span>
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-6">
                    {RECENT_SEARCHES.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between px-1">
                          <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            <Clock className="h-3 w-3" />
                            Recent Searches
                          </h3>
                          <button className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
                            Clear all
                          </button>
                        </div>
                        <div className="mt-2 space-y-0.5">
                          {RECENT_SEARCHES.map((search, i) => (
                            <button
                              key={i}
                              onClick={() => setQuery(search)}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors"
                            >
                              <Clock className="h-4 w-4 text-zinc-600 flex-shrink-0" />
                              <span className="flex-1 text-left">{search}</span>
                              <X className="h-3.5 w-3.5 text-zinc-700 hover:text-zinc-400" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        <TrendingUp className="h-3 w-3" />
                        Popular
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-1.5 px-1">
                        {POPULAR_SEARCHES.map((search, i) => (
                          <button
                            key={i}
                            onClick={() => setQuery(search)}
                            className="rounded-lg bg-zinc-800/60 border border-zinc-700/50 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-[#c8a44e] hover:border-[#c8a44e]/30 hover:bg-[#c8a44e]/5 transition-colors"
                          >
                            {search}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Browse Categories
                      </h3>
                      <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
                        {CATEGORIES.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => setQuery(category.name)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors"
                          >
                            <span className="text-base">{category.icon}</span>
                            <span className="flex-1 text-left text-xs font-medium">{category.name}</span>
                            <span className="text-[10px] text-zinc-600">{category.count.toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-[#c8a44e]">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}
