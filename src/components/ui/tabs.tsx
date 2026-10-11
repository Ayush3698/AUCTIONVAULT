"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  tabsRef: React.MutableRefObject<Map<string, HTMLButtonElement | null>>;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used within <Tabs>");
  return ctx;
}

interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
}

function Tabs({ defaultValue, value, onValueChange, className, children }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue);
  const activeTab = value ?? internal;
  const tabsRef = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  const setActiveTab = useCallback(
    (v: string) => {
      setInternal(v);
      onValueChange?.(v);
    },
    [onValueChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, tabsRef }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  className?: string;
  children: ReactNode;
}

function TabsList({ className, children }: TabsListProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-xl bg-zinc-900 border border-zinc-800 p-1",
        className
      )}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: ReactNode;
}

function TabsTrigger({ value, className, children }: TabsTriggerProps) {
  const { activeTab, setActiveTab, tabsRef } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      ref={(el) => {
        tabsRef.current.set(value, el);
      }}
      onClick={() => setActiveTab(value)}
      className={cn(
        "relative z-10 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200",
        isActive
          ? "text-black"
          : "text-zinc-400 hover:text-zinc-200",
        className
      )}
    >
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-[#c8a44e]"
          layoutId="tab-indicator"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  );
}

interface TabsContentProps {
  value: string;
  className?: string;
  children: ReactNode;
}

function TabsContent({ value, className, children }: TabsContentProps) {
  const { activeTab } = useTabs();
  if (activeTab !== value) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("mt-4", className)}
    >
      {children}
    </motion.div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, type TabsProps, type TabsListProps, type TabsTriggerProps, type TabsContentProps };
