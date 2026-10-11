"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Clock, Gavel, Users } from "lucide-react";
import { mockAuctions } from "@/lib/data";
import { CATEGORIES, cn, formatCurrency, getInitials, getTimeRemaining } from "@/lib/utils";
import type { Auction } from "@/lib/types";

type TimeRemaining = ReturnType<typeof getTimeRemaining>;

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatCompact(t: TimeRemaining): string {
  if (t.days > 0) return `${t.days}d ${t.hours}h`;
  if (t.hours > 0) return `${t.hours}h ${t.minutes}m`;
  if (t.minutes > 0) return `${t.minutes}m ${t.seconds}s`;
  return `${t.seconds}s`;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function LiveCard({ auction }: { auction: Auction }) {
  const now = useNow();
  const remaining = now ? getTimeRemaining(auction.endTime) : null;
  const category = CATEGORIES.find((c) => c.id === auction.category);

  return (
    <motion.article
      variants={itemVariants}
      className={cn(
        "glass card-glow group relative flex min-w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl",
        "border border-zinc-800/60 border-t-2 border-t-red-500/80",
        "transition-all duration-300 hover:border-red-500/30 md:min-w-0"
      )}
    >
      <div className="relative h-44 overflow-hidden rounded-t-2xl bg-gradient-to-b from-zinc-800 to-zinc-700">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(200,164,78,0.15),transparent_60%)]" />
        <Gavel className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-zinc-600" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-white/80" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          Live
        </span>
        <span className="absolute right-3 top-3 rounded-full border border-[#c8a44e]/30 bg-black/60 px-2.5 py-0.5 text-[11px] font-medium text-[#d4b565]">
          {category?.name ?? auction.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-zinc-100">
          {auction.title}
        </h3>

        <p className="text-xl font-bold text-gradient-gold">
          {formatCurrency(auction.currentBid, auction.currency)}
        </p>

        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-zinc-500" />
            {auction.participantCount} bidders
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <span className="font-medium tabular-nums text-zinc-300">
              {remaining ? formatCompact(remaining) : "—"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-zinc-800/60 pt-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700/70 text-[10px] font-semibold text-zinc-300">
            {getInitials(auction.seller.displayName)}
          </div>
          <span className="truncate text-xs text-zinc-400">
            {auction.seller.displayName}
          </span>
          {auction.seller.verified && (
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#c8a44e]" />
          )}
        </div>

        <Link
          href={`/auction/${auction.id}`}
          className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#c8a44e] text-sm font-semibold text-black transition-all duration-300 hover:bg-[#d4b565] hover:shadow-[0_0_24px_rgba(200,164,78,0.35)]"
        >
          Join Live
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.article>
  );
}

export default function FeaturedLive() {
  const liveAuctions = mockAuctions.filter((a) => a.status === "live");

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
              Featured Live Auctions
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Bid in real-time on the world&apos;s most coveted pieces.
          </p>
        </div>
        <Link
          href="/auction-house"
          className="group hidden items-center gap-1.5 text-sm font-semibold text-[#c8a44e] transition-colors hover:text-[#d4b565] sm:inline-flex"
        >
          View All
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>

      {liveAuctions.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-14 text-center">
          <Gavel className="h-8 w-8 text-zinc-600" />
          <h3 className="mt-4 text-lg font-semibold text-zinc-200">
            No live auctions right now
          </h3>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            When auctions go live on-chain they&apos;ll appear here. Create your
            first auction to get started.
          </p>
          <Link
            href="/create-auction"
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#c8a44e]/40 bg-[#c8a44e]/10 px-5 text-sm font-semibold text-[#c8a44e] transition-all hover:bg-[#c8a44e]/20"
          >
            Create Auction
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
          className="flex gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible md:pb-0 [scrollbar-width:none]"
        >
          {liveAuctions.map((auction) => (
            <LiveCard key={auction.id} auction={auction} />
          ))}
        </motion.div>
      )}

      <div className="mt-6 sm:hidden">
        <Link
          href="/auction-house"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#c8a44e] transition-colors hover:text-[#d4b565]"
        >
          View All
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}