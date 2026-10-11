"use client";

import { useEffect, useCallback, forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  children?: ReactNode;
}

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const contentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", damping: 25, stiffness: 300 },
  },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ open, onClose, className, children }, ref) => {
    const handleEscape = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      },
      [onClose]
    );

    useEffect(() => {
      if (open) {
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
      }
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
      };
    }, [open, handleEscape]);

    return (
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
            <motion.div
              ref={ref}
              className={cn(
                "glass relative z-10 w-full max-w-lg mx-4 rounded-2xl p-6 shadow-2xl",
                "border border-zinc-800/50",
                className
              )}
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }
);

Modal.displayName = "Modal";

type ModalHeaderProps = HTMLAttributes<HTMLDivElement>

const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("mb-4 pr-8", className)}
        {...props}
      />
    );
  }
);

ModalHeader.displayName = "ModalHeader";

type ModalTitleProps = HTMLAttributes<HTMLHeadingElement>

const ModalTitle = forwardRef<HTMLHeadingElement, ModalTitleProps>(
  ({ className, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={cn("text-xl font-semibold text-zinc-100", className)}
        {...props}
      />
    );
  }
);

ModalTitle.displayName = "ModalTitle";

type ModalDescriptionProps = HTMLAttributes<HTMLParagraphElement>

const ModalDescription = forwardRef<HTMLParagraphElement, ModalDescriptionProps>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("mt-1 text-sm text-zinc-400", className)}
        {...props}
      />
    );
  }
);

ModalDescription.displayName = "ModalDescription";

type ModalFooterProps = HTMLAttributes<HTMLDivElement>

const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-end gap-3 mt-6 pt-4 border-t border-zinc-800/50",
          className
        )}
        {...props}
      />
    );
  }
);

ModalFooter.displayName = "ModalFooter";

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  type ModalProps,
  type ModalHeaderProps,
  type ModalTitleProps,
  type ModalDescriptionProps,
  type ModalFooterProps,
};
