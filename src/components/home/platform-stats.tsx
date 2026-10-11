"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gavel, Gem, Globe, Radio, TrendingUp, Users } from "lucide-react";
import { mockPlatformStats } from "@/lib/data";
import { formatNumber } from "@/lib/utils";
import type { PlatformStats } from "@/lib/types";

interface StatConfig {
  label: string;
  value: number;
  icon: typeof Gavel;
  prefix?: string;
}

const EMPTY_STATS: PlatformStats = {
  totalAuctions: 0,
  liveAuctions: 0,
  registeredUsers: 0,
  countries: 0,
  totalBids: 0,
  totalAuctionValue: 0,
};

const stats = mockPlatformStats ?? EMPTY_STATS;

const STATS: StatConfig[] = [
  { label: "Total Auctions", value: stats.totalAuctions, icon: Gavel },
  { label: "Live Auctions", value: stats.liveAuctions, icon: Radio },
  { label: "Registered Users", value: stats.registeredUsers, icon: Users },
  { label: "Countries", value: stats.countries, icon: Globe },
  { label: "Total Bids", value: stats.totalBids, icon: TrendingUp },
  {
    label: "Total Auction Value",
    value: stats.totalAuctionValue,
    icon: Gem,
    prefix: "$",
  },
];

function useCountUp(target: number, duration = 2000): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function StatCard({ stat }: { stat: StatConfig }) {
  const count = useCountUp(stat.value);
  const Icon = stat.icon;

  return (
    <motion.div
      variants={itemVariants}
      className="glass card-glow flex flex-col items-center gap-2 rounded-2xl border border-zinc-800/60 px-6 py-8 text-center transition-colors duration-300 hover:border-[#c8a44e]/40"
    >
      <Icon className="mb-1 h-5 w-5 text-[#c8a44e]/60" />
      <span className="text-3xl font-bold tabular-nums tracking-tight text-[#e8d48b] sm:text-4xl">
        {stat.prefix ? `${stat.prefix}${formatNumber(count)}` : formatNumber(count)}
      </span>
      <span className="text-sm font-medium text-zinc-100">{stat.label}</span>
    </motion.div>
  );
}

export default function PlatformStats() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Gem className="h-6 w-6 text-[#c8a44e]" />
          <h2 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
            The Platform in Numbers
          </h2>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Live metrics will populate as auctions go live on-chain.
        </p>
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {STATS.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </motion.div>
    </section>
  );
}