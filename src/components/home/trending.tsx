"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Flame, Gavel, TrendingUp } from "lucide-react";
import { mockAuctions } from "@/lib/data";
import { CATEGORIES, formatCurrency, formatNumber } from "@/lib/utils";
import type { Auction } from "@/lib/types";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

function TrendingCard({ auction }: { auction: Auction }) {
  const category = CATEGORIES.find((c) => c.id === auction.category);

  return (
    <motion.article
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="glass card-glow group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-zinc-800/60 transition-colors duration-300 hover:border-[#c8a44e]/40"
    >
      <Link href={`/auction/${auction.id}`} className="contents">
        <div className="relative h-40 overflow-hidden rounded-t-2xl bg-gradient-to-br from-zinc-800 to-zinc-700">
          <Gavel className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-zinc-600" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(200,164,78,0.14),transparent_55%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-[#c8a44e]/30 bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-[#e8d48b]">
            <Flame className="h-3 w-3" />
            Trending
          </span>
          <span className="absolute right-3 top-3 rounded-full border border-zinc-700/60 bg-black/60 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
            {category?.name ?? auction.category}
          </span>

          <span className="absolute bottom-3 left-3 right-3 translate-y-2 text-sm font-semibold text-zinc-50 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            {auction.title}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2.5 p-4 pt-3">
          <h3 className="line-clamp-1 text-sm font-semibold text-zinc-100">
            {auction.title}
          </h3>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-gradient-gold">
              {formatCurrency(auction.currentBid, auction.currency)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-300">
              <TrendingUp className="h-3.5 w-3.5 text-[#c8a44e]" />
              Hot
            </span>
          </div>

          <div className="flex items-center gap-4 border-t border-zinc-800/60 pt-2.5 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Gavel className="h-3.5 w-3.5 text-zinc-500" />
              {formatNumber(auction.bidCount)} bids
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-zinc-500" />
              {formatNumber(auction.watcherCount)} watching
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export default function Trending() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
              Trending Now
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            The pieces every collector is watching right now.
          </p>
        </div>
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={containerVariants}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {mockAuctions.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-14 text-center">
            <Gavel className="h-8 w-8 text-zinc-600" />
            <h3 className="mt-4 text-lg font-semibold text-zinc-200">
              Nothing trending yet
            </h3>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              Trending auctions will populate here once live bids start
              coming in.
            </p>
          </div>
        ) : (
          mockAuctions.map((auction) => (
            <TrendingCard key={auction.id} auction={auction} />
          ))
        )}
      </motion.div>
    </section>
  );
}