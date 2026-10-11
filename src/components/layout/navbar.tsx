"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, ChevronDown, Menu, X, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENCIES } from "@/lib/utils";
import { SearchOverlay } from "./search-overlay";
import { ConnectButton } from "@/components/wallet/connect-button";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/auction-house", label: "Auction House" },
  { href: "/create-auction", label: "Create Auction" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
] as const;

const LANGUAGES = ["EN", "FR", "DE", "ES", "AR", "JA", "ZH"] as const;

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [selectedLanguage, setSelectedLanguage] = useState("EN");
  const [notificationCount] = useState(3);
  const currencyRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setCurrencyOpen(false);
      }
      if (languageRef.current && !languageRef.current.contains(e.target as Node)) {
        setLanguageOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-zinc-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link href="/" className="flex-shrink-0">
              <span className="text-lg font-bold tracking-tight text-zinc-100">
                AUCTION
                <span className="gold-gradient">VAULT</span>
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "text-[#c8a44e]"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
                    )}
                  >
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute inset-x-1 -bottom-[1px] h-0.5 rounded-full bg-[#c8a44e]"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>

              <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors">
                <Bell className="h-[18px] w-[18px]" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[#c8a44e] text-[10px] font-bold text-black">
                    {notificationCount}
                  </span>
                )}
              </button>

              <div className="relative" ref={currencyRef}>
                <button
                  onClick={() => {
                    setCurrencyOpen(!currencyOpen);
                    setLanguageOpen(false);
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
                >
                  {selectedCurrency}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", currencyOpen && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {currencyOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 glass rounded-xl border border-zinc-800/50 py-1.5 shadow-2xl"
                    >
                      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Fiat
                      </div>
                      {CURRENCIES.filter((c) => c.type === "fiat").map((currency) => (
                        <button
                          key={currency.code}
                          onClick={() => {
                            setSelectedCurrency(currency.code);
                            setCurrencyOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                            selectedCurrency === currency.code
                              ? "text-[#c8a44e] bg-[#c8a44e]/5"
                              : "text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100"
                          )}
                        >
                          <span className="w-5 text-center text-xs font-medium text-zinc-500">{currency.symbol}</span>
                          <span>{currency.code}</span>
                          <span className="text-xs text-zinc-500">{currency.name}</span>
                        </button>
                      ))}
                      <div className="my-1.5 border-t border-zinc-800/50" />
                      <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Crypto
                      </div>
                      {CURRENCIES.filter((c) => c.type === "crypto" || c.type === "stablecoin").map((currency) => (
                        <button
                          key={currency.code}
                          onClick={() => {
                            setSelectedCurrency(currency.code);
                            setCurrencyOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                            selectedCurrency === currency.code
                              ? "text-[#c8a44e] bg-[#c8a44e]/5"
                              : "text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100"
                          )}
                        >
                          <span className="w-5 text-center text-xs font-medium text-zinc-500">{currency.symbol}</span>
                          <span>{currency.code}</span>
                          <span className="text-xs text-zinc-500">{currency.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative" ref={languageRef}>
                <button
                  onClick={() => {
                    setLanguageOpen(!languageOpen);
                    setCurrencyOpen(false);
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {selectedLanguage}
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", languageOpen && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {languageOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-40 glass rounded-xl border border-zinc-800/50 py-1.5 shadow-2xl"
                    >
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            setSelectedLanguage(lang);
                            setLanguageOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center px-3 py-2 text-sm transition-colors",
                            selectedLanguage === lang
                              ? "text-[#c8a44e] bg-[#c8a44e]/5"
                              : "text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100"
                          )}
                        >
                          {lang}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="ml-1 h-6 w-px bg-zinc-800" />

              <ConnectButton />
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setSearchOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
              >
                <Search className="h-[18px] w-[18px]" />
              </button>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-sm glass border-l border-zinc-800/50 overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
                <Link href="/" className="text-lg font-bold tracking-tight text-zinc-100" onClick={() => setMobileOpen(false)}>
                  AUCTION
                  <span className="gold-gradient">VAULT</span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setSearchOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50 px-4 py-3 text-sm text-zinc-500"
                >
                  <Search className="h-4 w-4" />
                  Search auctions...
                </button>
              </div>

              <div className="px-2">
                {NAV_LINKS.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors mx-2",
                        isActive
                          ? "text-[#c8a44e] bg-[#c8a44e]/10"
                          : "text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100"
                      )}
                    >
                      {link.label}
                      {isActive && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#c8a44e]" />
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="mx-6 my-4 border-t border-zinc-800/50" />

              <div className="px-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Currency</span>
                  <span className="text-xs text-zinc-300 font-medium">{selectedCurrency}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CURRENCIES.filter((c) => c.type === "fiat").map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => setSelectedCurrency(currency.code)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        selectedCurrency === currency.code
                          ? "bg-[#c8a44e]/15 text-[#c8a44e] border border-[#c8a44e]/30"
                          : "bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200"
                      )}
                    >
                      {currency.code}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-6 my-4 border-t border-zinc-800/50" />

              <div className="px-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">Language</span>
                  <span className="text-xs text-zinc-300 font-medium">{selectedLanguage}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLanguage(lang)}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                        selectedLanguage === lang
                          ? "bg-[#c8a44e]/15 text-[#c8a44e] border border-[#c8a44e]/30"
                          : "bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 hover:text-zinc-200"
                      )}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 mt-4">
                <ConnectButton className="w-full" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-16 lg:hidden" />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
