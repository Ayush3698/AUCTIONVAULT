"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, Gavel, Timer, Users } from "lucide-react";
import { mockAuctions } from "@/lib/data";
import { CATEGORIES, cn, formatCurrency, getTimeRemaining } from "@/lib/utils";
import type { Auction } from "@/lib/types";

type TimeRemaining = ReturnType<typeof getTimeRemaining>;

const SIX_HOURS = 6 * 60 * 60 * 1000;

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatFullTime(t: TimeRemaining): string {
  const hh = String(t.hours).padStart(2, "0");
  const mm = String(t.minutes).padStart(2, "0");
  const ss = String(t.seconds).padStart(2, "0");
  return t.days > 0 ? `${t.days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function EndingCard({ auction }: { auction: Auction }) {
  const now = useNow();
  const remaining = now ? getTimeRemaining(auction.endTime) : null;
  const urgent = remaining !== null && remaining.total < 3600000;
  const category = CATEGORIES.find((c) => c.id === auction.category);

  return (
    <motion.article
      variants={itemVariants}
      className="glass card-glow group relative flex overflow-hidden rounded-2xl border border-zinc-800/60 transition-all duration-300 hover:border-[#f59e0b]/40"
    >
      <div className="relative h-auto w-36 shrink-0 bg-gradient-to-b from-zinc-800 to-zinc-700 sm:w-44">
        <Gavel className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-zinc-600" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(245,158,11,0.12),transparent_60%)]" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-[#f59e0b]/30 bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f59e0b]">
          <AlertTriangle className="h-3 w-3" />
          Ending Soon
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-100">
          {auction.title}
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold text-gradient-gold">
            {formatCurrency(auction.currentBid, auction.currency)}
          </span>
          <span className="rounded-full border border-zinc-700/60 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            {category?.name ?? auction.category}
          </span>
        </div>

        <div
          className={cn(
            "inline-flex items-center gap-2 self-start rounded-xl border px-3 py-2",
            urgent
              ? "animate-countdown-pulse border-[#f59e0b]/40 bg-[#f59e0b]/10"
              : "border-[#f59e0b]/20 bg-[#f59e0b]/[0.06]"
          )}
        >
          <Timer
            className={cn(
              "h-4 w-4",
              urgent ? "text-[#f59e0b]" : "text-zinc-400"
            )}
          />
          <span
            className={cn(
              "font-mono text-base font-bold tabular-nums tracking-tight",
              urgent ? "text-[#f59e0b]" : "text-zinc-200"
            )}
          >
            {remaining ? formatFullTime(remaining) : "--:--:--"}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">
            left
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Users className="h-3.5 w-3.5 text-zinc-500" />
          {auction.participantCount} bidders
        </div>

        <Link
          href={`/auction/${auction.id}`}
          className="mt-auto inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-4 text-xs font-semibold text-[#f59e0b] transition-all duration-300 hover:bg-[#f59e0b]/20 hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]"
        >
          Quick Bid
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </motion.article>
  );
}

export default function EndingSoon() {
  const now = useNow();
  const endingSoonAuctions = mockAuctions.filter((a) => {
    if (a.status === "ending-soon") return true;
    if (now === null) return false;
    const remaining = new Date(a.endTime).getTime() - now;
    return remaining > 0 && remaining <= SIX_HOURS;
  });

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-[#f59e0b]" />
            <h2 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
              Ending Soon
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Final moments — place your bid before it&apos;s gone.
          </p>
        </div>
      </div>

      {endingSoonAuctions.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-14 text-center">
          <Timer className="h-8 w-8 text-zinc-600" />
          <h3 className="mt-4 text-lg font-semibold text-zinc-200">
            Nothing ending soon
          </h3>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Auctions winding down to their final moments will show up here.
          </p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={containerVariants}
          className="grid grid-cols-1 gap-5 lg:grid-cols-2"
        >
          {endingSoonAuctions.map((auction) => (
            <EndingCard key={auction.id} auction={auction} />
          ))}
        </motion.div>
      )}
    </section>
  );
}