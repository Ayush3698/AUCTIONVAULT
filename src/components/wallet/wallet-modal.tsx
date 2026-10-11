"use client";

import { useState, useCallback } from "react";
import {
  useConnect,
  type Connector,
  type CreateConnectorFn,
} from "wagmi";
import { ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Modal, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { useWalletDiscovery, type WalletInfo } from "@/hooks/use-wallet-discovery";

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
}

function WalletIcon({ wallet }: { wallet: WalletInfo }) {
  if (wallet.icon && /^(https?:|data:image\/)/i.test(wallet.icon)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={wallet.icon}
        alt={`${wallet.name} logo`}
        className="h-8 w-8 rounded-lg object-contain"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-lg">
      {wallet.icon}
    </div>
  );
}

export function WalletModal({ open, onClose }: WalletModalProps) {
  const { connectors, connect, isPending } = useConnect();
  const { wallets, isDiscovering } = useWalletDiscovery(connectors);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = useCallback(
    async (wallet: WalletInfo) => {
      if (!wallet.connector && !wallet.connectorFn) return;

      setError(null);
      setConnectingId(wallet.id);

      try {
        // Prefer the connector bound to the exact EIP-6963/flagged provider.
        const nextConnector: Connector | CreateConnectorFn | undefined =
          wallet.connectorFn ?? wallet.connector;

        if (!nextConnector) return;

        await connect({ connector: nextConnector });
        onClose();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Connection failed";
        if (message.includes("User rejected")) {
          setError("Connection rejected. Please try again.");
        } else {
          setError("Connection failed. Please try again.");
        }
        console.error("[WalletConnect] failed to connect:", wallet.name, err);
      } finally {
        setConnectingId(null);
      }
    },
    [connect, onClose]
  );

  const installedWallets = wallets.filter((w) => w.installed);
  const notInstalledWallets = wallets.filter((w) => !w.installed);
  const walletConnectWallet = wallets.find((w) => w.isWalletConnect);

  const regularInstalled = installedWallets.filter((w) => !w.isWalletConnect);

  return (
    <Modal open={open} onClose={onClose} className="max-w-md">
      <ModalHeader>
        <ModalTitle>Connect Wallet</ModalTitle>
        <p className="mt-1 text-sm text-zinc-400">Choose a wallet</p>
      </ModalHeader>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isDiscovering ? (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-zinc-800/50 bg-zinc-800/30 px-4 py-3"
            >
              <div className="h-8 w-8 animate-pulse rounded-lg bg-zinc-800" />
              <div className="flex-1">
                <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
                <div className="mt-1 h-3 w-16 animate-pulse rounded bg-zinc-800/50" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {regularInstalled.length > 0 && (
            <div className="space-y-1">
              {regularInstalled.map((wallet) => {
                const isConnecting = connectingId === wallet.id;
                const noConnector = !wallet.connector && !wallet.connectorFn;
                return (
                  <button
                    key={wallet.id}
                    type="button"
                    onClick={() => handleConnect(wallet)}
                    disabled={isPending || isConnecting || noConnector}
                    className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition-all hover:border-zinc-700/50 hover:bg-zinc-800/40 disabled:opacity-60"
                  >
                    <WalletIcon wallet={wallet} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-100">
                        {wallet.name}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-green-400">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                        Installed
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                      ) : (
                        <span className="rounded-lg border border-zinc-700/50 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors group-hover:border-zinc-600 group-hover:text-zinc-100">
                          Connect
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {walletConnectWallet && (
            <button
              type="button"
              onClick={() => handleConnect(walletConnectWallet)}
              disabled={isPending || connectingId === walletConnectWallet.id}
              className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition-all hover:border-zinc-700/50 hover:bg-zinc-800/40 disabled:opacity-60"
            >
              <WalletIcon wallet={walletConnectWallet} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-zinc-100">
                  WalletConnect
                </div>
                <div className="text-xs text-zinc-500">
                  Connect with mobile or QR code
                </div>
              </div>
              {connectingId === "walletConnect" ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              ) : null}
            </button>
          )}

          {notInstalledWallets.length > 0 && (
            <div className="mt-2 space-y-1">
              {(regularInstalled.length > 0 || walletConnectWallet) && (
                <div className="px-4 py-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600">
                    Not installed
                  </div>
                </div>
              )}
              {notInstalledWallets.map((wallet) => (
                <a
                  key={wallet.id}
                  href={wallet.installUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition-all hover:border-zinc-700/50 hover:bg-zinc-800/40"
                >
                  <WalletIcon wallet={wallet} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-100">
                      {wallet.name}
                    </div>
                    <div className="text-xs text-zinc-500">Not Installed</div>
                  </div>
                  <ExternalLink className="h-4 w-4 flex-shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400" />
                </a>
              ))}
            </div>
          )}

          {wallets.length === 0 && (
            <div className="py-8 text-center text-sm text-zinc-500">
              No wallets detected.
            </div>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-zinc-800/50 pt-4">
        <p className="text-center text-xs text-zinc-600">
          Don&apos;t have a wallet?{" "}
          <a
            href="https://ethereum.org/en/wallets/find-wallet/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#c8a44e] hover:text-[#d4b565] transition-colors"
          >
            Get a wallet
          </a>
        </p>
      </div>
    </Modal>
  );
}