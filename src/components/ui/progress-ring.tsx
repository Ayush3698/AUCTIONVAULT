"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  strokeColor?: string;
  trackColor?: string;
  className?: string;
}

function ProgressRing({
  progress,
  size = 64,
  strokeWidth = 4,
  strokeColor = "#c8a44e",
  trackColor = "#27272a",
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [animatedOffset, setAnimatedOffset] = useState(circumference);

  useEffect(() => {
    const timeout = requestAnimationFrame(() => {
      setAnimatedOffset(circumference - (clamped / 100) * circumference);
    });
    return () => cancelAnimationFrame(timeout);
  }, [clamped, circumference]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          style={{
            transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
    </div>
  );
}

export { ProgressRing, type ProgressRingProps };
