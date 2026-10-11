"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Gavel, Plus, Sparkles } from "lucide-react";
import { mockPlatformStats } from "@/lib/data";
import { formatNumber } from "@/lib/utils";

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 137) % 100,
  top: (i * 89) % 100,
  size: 2 + (i % 3),
  delay: (i % 9) * 0.5,
  duration: 5 + (i % 5) * 1.2,
  opacity: 0.15 + (i % 4) * 0.08,
}));

function useCountUp(target: number, duration = 1800): number {
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

interface HeroStatProps {
  label: string;
  value: number;
  formatter?: (n: number) => string;
}

function HeroStat({ label, value, formatter }: HeroStatProps) {
  const count = useCountUp(value);
  return (
    <div className="flex flex-col items-center gap-1.5 py-4 text-center sm:py-0">
      <span className="text-2xl font-bold tracking-tight text-[#e8d48b] sm:text-3xl">
        {formatter ? formatter(count) : count.toLocaleString()}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
    </div>
  );
}

export default function Hero() {
  const stats = mockPlatformStats ?? {
    liveAuctions: 0,
    countries: 0,
    totalAuctionValue: 0,
    totalAuctions: 0,
    registeredUsers: 0,
    totalBids: 0,
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0b0b0e] via-[#101014] to-[#09090b]">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-[#c8a44e]/[0.08] blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#c8a44e]/[0.05] blur-[100px]" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-[#c8a44e]/[0.06] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(200,164,78,0.04),transparent_60%)]" />
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-0">
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-[#e8d48b]"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
            }}
            animate={{ y: [0, -14, 0], opacity: [p.opacity, Math.min(p.opacity * 2, 0.85), p.opacity] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col items-center justify-center px-4 pb-16 pt-24 text-center sm:px-6 lg:px-8">
        <div className="animate-slide-up flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c8a44e]/25 bg-[#c8a44e]/[0.08] px-4 py-1.5 text-xs font-medium tracking-wide text-[#d4b565]">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Live Now — open to the highest bidder on the Sepolia testnet
          </div>

          <h1 className="mt-8 text-5xl font-bold leading-[1.05] tracking-tight text-zinc-50 sm:text-6xl md:text-7xl lg:text-8xl">
            Bid Beyond <span className="text-gradient-gold">Limits.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg md:text-xl">
            The world&apos;s most exclusive auction house. Curated masterpieces in
            watches, art, rare automobiles, and collectibles — fully on-chain on
            the Sepolia testnet, authenticated, insured, and open to the highest
            bidder.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/auction-house"
              className="group inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-[#c8a44e] px-8 text-base font-semibold text-black transition-all duration-300 hover:bg-[#d4b565] hover:shadow-[0_0_40px_rgba(200,164,78,0.4)]"
            >
              <Gavel className="h-5 w-5" />
              Explore Auctions
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/create-auction"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-[#c8a44e]/40 bg-transparent px-8 text-base font-semibold text-[#c8a44e] transition-all duration-300 hover:border-[#c8a44e]/70 hover:bg-[#c8a44e]/10"
            >
              <Plus className="h-5 w-5" />
              Create Auction
            </Link>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="glass grid grid-cols-1 divide-y divide-zinc-800/70 rounded-2xl border border-[#c8a44e]/15 px-6 py-2 shadow-luxury sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:py-4">
          <HeroStat
            label="Live Auctions"
            value={stats.liveAuctions}
          />
          <HeroStat label="Countries" value={stats.countries} />
          <HeroStat
            label="Total Value"
            value={stats.totalAuctionValue}
            formatter={(n) => `$${formatNumber(n)}`}
          />
        </div>
      </div>
    </section>
  );
}