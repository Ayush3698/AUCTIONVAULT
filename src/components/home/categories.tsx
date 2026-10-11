"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
import { CATEGORIES, formatNumber } from "@/lib/utils";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function Categories() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-6 w-6 text-[#c8a44e]" />
            <h2 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
              Explore Categories
            </h2>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            From rare masterpieces to modern icons — find what moves you.
          </p>
        </div>
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        variants={containerVariants}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
      >
        {CATEGORIES.map((category) => (
          <motion.div key={category.id} variants={itemVariants}>
            <Link
              href={`/auction-house?category=${category.id}`}
              className="glass card-glow group flex flex-col items-center gap-2 rounded-2xl border border-zinc-800/60 px-4 py-6 text-center transition-all duration-300 hover:scale-[1.04] hover:border-[#c8a44e]/50 hover:shadow-[0_0_30px_rgba(200,164,78,0.15)]"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/80 text-2xl transition-all duration-300 group-hover:bg-[#c8a44e]/10 group-hover:shadow-[0_0_20px_rgba(200,164,78,0.2)]">
                {category.icon}
              </span>
              <span className="mt-1 text-sm font-semibold text-zinc-100">
                {category.name}
              </span>
              <span className="text-xs text-zinc-500">
                {formatNumber(category.count)} items
              </span>
              <ArrowUpRight className="mt-1 h-4 w-4 text-zinc-600 opacity-0 transition-all duration-300 group-hover:opacity-100" />
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}