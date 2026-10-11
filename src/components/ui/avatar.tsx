import Image from "next/image";
import { forwardRef } from "react";
import { cn, getInitials } from "@/lib/utils";

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
} as const;

type AvatarSize = keyof typeof sizes;

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  online?: boolean;
  verified?: boolean;
  className?: string;
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, name = "", size = "md", online, verified }, ref) => {
    const initials = getInitials(name || alt || "?");

    return (
      <div ref={ref} className={cn("relative inline-flex shrink-0", className)}>
        <div
          className={cn(
            "relative flex items-center justify-center overflow-hidden rounded-full",
            "bg-zinc-800 ring-2 ring-zinc-800",
            sizes[size]
          )}
        >
          {src ? (
            <Image
              src={src}
              alt={alt || name}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <span className="font-medium text-zinc-400 select-none">{initials}</span>
          )}
        </div>

        {online && (
          <span
            className={cn(
              "absolute bottom-0 right-0 block rounded-full bg-green-500 ring-2 ring-background",
              size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"
            )}
          />
        )}

        {verified && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#c8a44e] ring-2 ring-background">
            <svg
              className="h-2.5 w-2.5 text-black"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

export { Avatar, type AvatarProps, type AvatarSize };
