"use client";

import { useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Globe, MapPin } from "lucide-react";
import { mockGlobalActivities } from "@/lib/data";
import { getRelativeTime } from "@/lib/utils";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function getFlagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function GlobalActivity() {
  const mounted = useMounted();

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-[#c8a44e]" />
          <h2 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
            Global Auction Activity
          </h2>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Live action from auction houses around the world.
        </p>
      </div>

      {mockGlobalActivities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-14 text-center">
          <Globe className="h-8 w-8 text-zinc-600" />
          <h3 className="mt-4 text-lg font-semibold text-zinc-200">
            No live activity yet
          </h3>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Auction activity from around the world will appear here in
            real time.
          </p>
        </div>
      ) : (
        <motion.ul
          initial="hidden"
          animate={mounted ? "visible" : "hidden"}
          variants={containerVariants}
          className="space-y-3"
        >
          {mockGlobalActivities.map((activity) => (
            <motion.li
              key={activity.id}
              variants={itemVariants}
              className="glass flex items-center gap-4 rounded-xl border border-zinc-800/60 px-4 py-3.5 transition-colors duration-300 hover:border-[#c8a44e]/30"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 text-xl">
                {getFlagEmoji(activity.countryCode)}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-zinc-300">
                  <span className="inline-flex items-center gap-1 font-semibold text-zinc-100">
                    <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                    {activity.city}
                  </span>
                  <span className="text-zinc-500">{activity.action}</span>
                  <span className="font-medium text-[#d4b565]">
                    {activity.auctionTitle}
                  </span>
                </p>
              </div>

              <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                {mounted ? getRelativeTime(activity.timestamp) : "—"}
              </span>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </section>
  );
}