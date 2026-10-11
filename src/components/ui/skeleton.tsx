import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SkeletonProps = HTMLAttributes<HTMLDivElement>

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-xl bg-zinc-800/50",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton, type SkeletonProps };
