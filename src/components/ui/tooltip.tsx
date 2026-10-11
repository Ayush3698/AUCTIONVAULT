"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom";
  delayMs?: number;
}

const positionClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
} as const;

function Tooltip({
  content,
  children,
  className,
  side = "top",
  delayMs = 300,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), delayMs);
  };

  const hide = () => {
    clearTimeout(timeoutRef.current!);
    setVisible(false);
  };

  useEffect(() => () => clearTimeout(timeoutRef.current!), []);

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium",
          "bg-zinc-800 text-zinc-200 border border-zinc-700 shadow-lg",
          "transition-all duration-150",
          positionClasses[side],
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 scale-95",
          side === "top" && !visible && "translate-y-1",
          side === "bottom" && !visible && "-translate-y-1",
          className
        )}
      >
        {content}
      </div>
    </div>
  );
}

export { Tooltip, type TooltipProps };
