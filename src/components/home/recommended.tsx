"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Sparkles } from "lucide-react";
import { mockAuctions } from "@/lib/data";
import { CATEGORIES, formatCurrency, getInitials } from "@/lib/utils";
import type { Auction } from "@/lib/types";

const REASONS: Record<string, string> = {
  watches: "Based on your interest in Watches",
  art: "Based on your interest in Contemporary Art",
  cars: "Based on your interest in Classic Cars",
  fashion: "Based on your interest in Luxury Fashion",
  jewelry: "Based on your interest in Fine Jewelry",
  collectibles: "Based on your interest in Collectibles",
  electronics: "Matches your saved searches",
  sports: "Based on your interest in Sports Memorabilia",
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function RecommendedCard({ auction }: { auction: Auction }) {
  const category = CATEGORIES.find((c) => c.id === auction.category);
  const reason = REASONS[auction.category] ?? "Matches your browsing history";

  return (
    <motion.article
      variants={itemVariants}
      className="glass card-glow group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 transition-all duration-300 hover:border-[#c8a44e]/40"
    >
      <Link href={`/auction/${auction.id}`} className="contents">
        <div className="relative h-40 overflow-hidden rounded-t-2xl bg-gradient-to-b from-zinc-800 to-zinc-700">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(200,164,78,0.12),transparent_55%)]" />
          <span className="absolute left-3 top-3 rounded-full border border-zinc-700/60 bg-black/60 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
            {category?.name ?? auction.category}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 pt-3">
          <h3 className="line-clamp-1 text-sm font-semibold text-zinc-100">
            {auction.title}
          </h3>

          <p className="text-lg font-bold text-gradient-gold">
            {formatCurrency(auction.currentBid, auction.currency)}
          </p>

          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-700/70 text-[9px] font-semibold text-zinc-300">
              {getInitials(auction.seller.displayName)}
            </div>
            <span className="truncate text-xs text-zinc-400">
              {auction.seller.displayName}
            </span>
            {auction.seller.verified && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#c8a44e]" />
            )}
          </div>

          <span className="mt-auto inline-flex items-center gap-1.5 self-start rounded-lg border border-[#c8a44e]/20 bg-[#c8a44e]/[0.08] px-2.5 py-1 text-[11px] font-medium text-[#d4b565]">
            <Sparkles className="h-3 w-3" />
            {reason}
          </span>
        </div>
      </Link>
    </motion.article>
  );
}

export default function Recommended() {
  const recommendedAuctions = mockAuctions.slice(0, 4);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-[#c8a44e]" />
            <h2 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
              Recommended For You
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Hand-picked for your taste, powered by your browsing history.
          </p>
        </div>
        <Link
          href="/auction-house"
          className="group hidden items-center gap-1.5 text-sm font-semibold text-[#c8a44e] transition-colors hover:text-[#d4b565] sm:inline-flex"
        >
          See More
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={containerVariants}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
      >
        {recommendedAuctions.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-14 text-center">
            <Sparkles className="h-8 w-8 text-zinc-600" />
            <h3 className="mt-4 text-lg font-semibold text-zinc-200">
              No recommendations yet
            </h3>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              Once you browse and bid on auctions, personalized picks will
              show up here.
            </p>
          </div>
        ) : (
          recommendedAuctions.map((auction) => (
            <RecommendedCard key={auction.id} auction={auction} />
          ))
        )}
      </motion.div>
    </section>
  );
}