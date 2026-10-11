"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, getTimeRemaining } from "@/lib/utils";

interface CountdownProps {
  endDate: string;
  className?: string;
  compact?: boolean;
  onEnd?: () => void;
}

function padZero(n: number): string {
  return n.toString().padStart(2, "0");
}

function CountdownUnit({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800/80 border border-zinc-700/50 font-mono text-2xl font-bold text-zinc-100 tabular-nums">
          {padZero(value)}
        </div>
      </div>
      <span className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </span>
    </div>
  );
}

function CompactCountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-0.5">
      <span className="font-mono text-lg font-bold text-zinc-100 tabular-nums">
        {padZero(value)}
      </span>
      <span className="text-[10px] text-zinc-500">{label}</span>
    </div>
  );
}

function Countdown({ endDate, className, compact = false, onEnd }: CountdownProps) {
  const [time, setTime] = useState<ReturnType<typeof getTimeRemaining> | null>(null);
  const ended = time !== null && time.total <= 0;

  const tick = useCallback(() => {
    const next = getTimeRemaining(endDate);
    setTime(next);
    if (next.total <= 0) onEnd?.();
  }, [endDate, onEnd]);

  useEffect(() => {
    if (ended) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick, ended]);

  if (time === null) {
    return (
      <div className={cn("font-mono text-sm font-bold text-zinc-100 tabular-nums", className)}>
        --:--:--
      </div>
    );
  }

  if (ended) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 text-sm font-medium text-red-400",
          className
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        Ended
      </div>
    );
  }

  if (compact) {
    const showDays = time.days > 0;
    return (
      <div className={cn("flex items-center gap-1.5 text-zinc-400", className)}>
        {showDays && (
          <>
            <CompactCountdownUnit value={time.days} label="d" />
            <span className="text-zinc-600">:</span>
          </>
        )}
        <CompactCountdownUnit value={time.hours} label="h" />
        <span className="text-zinc-600">:</span>
        <CompactCountdownUnit value={time.minutes} label="m" />
        <span className="text-zinc-600">:</span>
        <CompactCountdownUnit value={time.seconds} label="s" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <CountdownUnit value={time.days} label="Days" />
      <span className="mt-[-14px] text-xl font-bold text-zinc-600">:</span>
      <CountdownUnit value={time.hours} label="Hours" />
      <span className="mt-[-14px] text-xl font-bold text-zinc-600">:</span>
      <CountdownUnit value={time.minutes} label="Min" />
      <span className="mt-[-14px] text-xl font-bold text-zinc-600">:</span>
      <CountdownUnit value={time.seconds} label="Sec" />
    </div>
  );
}

export { Countdown, type CountdownProps };
