"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import {
  Wallet,
  WalletMinimal,
  Copy,
  ExternalLink,
  LogOut,
  ChevronDown,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletModal } from "./wallet-modal";

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getBlockExplorerUrl(chainId: number, address: string): string {
  const explorers: Record<number, string> = {
    1: "https://etherscan.io",
    11155111: "https://sepolia.etherscan.io",
  };
  const base = explorers[chainId] ?? "https://etherscan.io";
  return `${base}/address/${address}`;
}

function getConnectorName(connectorId: string | undefined, connectorName: string | undefined): string {
  if (connectorName && connectorName !== "Injected") return connectorName;
  if (!connectorId) return "Wallet";
  const names: Record<string, string> = {
    injected: "Browser Wallet",
    coinbaseWalletSDK: "Coinbase Wallet",
    walletConnect: "WalletConnect",
    metaMask: "MetaMask",
    rabby: "Rabby",
    braveWallet: "Brave Wallet",
  };
  return names[connectorId] ?? connectorName ?? "Wallet";
}

interface ConnectButtonProps {
  className?: string;
}

export function ConnectButton({ className }: ConnectButtonProps) {
  const { address, isConnected, connector } = useAccount();
  const { isPending: isConnecting } = useConnect();
  const { disconnect, isPending: isDisconnecting } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const emptySubscribe = () => () => {};
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    }
  };

  const isWrongNetwork = isConnected && chainId !== sepolia.id;

  if (!mounted) {
    return (
      <button
        type="button"
        className={cn(
          "flex h-9 items-center justify-center gap-2 rounded-xl bg-[#c8a44e] px-4 text-sm font-medium text-black shadow-[0_0_20px_rgba(200,164,78,0.2)] transition-all hover:bg-[#d4b565]",
          className
        )}
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </button>
    );
  }

  if (isWrongNetwork) {
    return (
      <div className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => switchChain({ chainId: sepolia.id })}
          disabled={isSwitching}
          className="flex h-9 items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 text-sm font-medium text-yellow-400 transition-all hover:bg-yellow-500/20 disabled:opacity-60"
        >
          {isSwitching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          Wrong Network — Switch to Sepolia
        </button>
      </div>
    );
  }

  if (isConnected && address) {
    const walletName = getConnectorName(connector?.id, connector?.name);
    const explorerUrl = getBlockExplorerUrl(chainId, address);

    return (
      <div className={cn("relative", className)} ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-9 items-center gap-2 rounded-xl border border-zinc-700/50 bg-zinc-800/80 px-4 text-sm font-medium text-zinc-100 transition-all hover:border-zinc-600"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <WalletMinimal className="h-4 w-4 text-[#c8a44e]" />
          <span className="hidden sm:inline text-xs text-zinc-400">{walletName}</span>
          <span className="font-mono text-xs">{shortenAddress(address)}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-zinc-500 transition-transform",
              menuOpen && "rotate-180"
            )}
          />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-zinc-800/50 bg-[#111113] shadow-2xl">
            <div className="border-b border-zinc-800/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#c8a44e]/10 text-lg">
                  <WalletMinimal className="h-5 w-5 text-[#c8a44e]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-zinc-100">
                    {walletName}
                  </div>
                  <div className="font-mono text-xs text-zinc-500">
                    {shortenAddress(address)}
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-medium text-green-400">
                    Connected
                  </span>
                </div>
              </div>
            </div>

            <div className="p-1.5">
              <button
                type="button"
                onClick={() => {
                  handleCopyAddress();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
              >
                <Copy className="h-4 w-4 text-zinc-500" />
                {copied ? "Copied!" : "Copy Address"}
              </button>

              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800/60 hover:text-zinc-100"
              >
                <ExternalLink className="h-4 w-4 text-zinc-500" />
                View on Explorer
              </a>
            </div>

            <div className="border-t border-zinc-800/50 p-1.5">
              <button
                type="button"
                onClick={() => {
                  disconnect();
                  setMenuOpen(false);
                }}
                disabled={isDisconnecting}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Disconnect
              </button>
            </div>
          </div>
        )}

        <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        disabled={isConnecting}
        className={cn(
          "flex h-9 items-center justify-center gap-2 rounded-xl bg-[#c8a44e] px-4 text-sm font-medium text-black shadow-[0_0_20px_rgba(200,164,78,0.2)] transition-all hover:bg-[#d4b565] disabled:opacity-70",
          className
        )}
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {isConnecting ? "Connecting…" : "Connect Wallet"}
      </button>
      <WalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
