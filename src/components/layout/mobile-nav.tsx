"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { House, Gavel, Plus, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", icon: House, label: "Home" },
  { href: "/auction-house", icon: Gavel, label: "Auctions" },
  { href: "/create-auction", icon: Plus, label: "Create" },
  { href: "/history", icon: Clock, label: "History" },
  { href: "/profile", icon: User, label: "Profile" },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="glass border-t border-zinc-800/50">
        <div className="flex items-center justify-around px-2 py-1.5">
          {ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const isCreate = item.href === "/create-auction";
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2 transition-colors",
                  isCreate ? "px-4" : "min-w-[56px]",
                  isActive
                    ? "text-[#c8a44e]"
                    : "text-zinc-500 active:text-zinc-300"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-x-1 -top-1.5 h-0.5 rounded-full bg-[#c8a44e]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                {isCreate ? (
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                      isActive
                        ? "bg-[#c8a44e] text-black shadow-[0_0_20px_rgba(200,164,78,0.3)]"
                        : "bg-zinc-800 border border-zinc-700/50"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                ) : (
                  <>
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
