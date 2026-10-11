"use client";

import { useState, useEffect, useCallback } from "react";
import type { Connector, CreateConnectorFn } from "wagmi";
import type { EIP1193Provider } from "viem";
import { injected } from "wagmi";

export interface WalletInfo {
  id: string;
  name: string;
  icon: string;
  installed: boolean;
  connector?: Connector;
  connectorFn?: CreateConnectorFn;
  provider?: EIP1193Provider;
  isWalletConnect?: boolean;
  injectedDetected?: boolean;
  installUrl?: string;
}

interface EIP6963ProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: unknown;
}

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      isCoinbaseWallet?: boolean;
      isRabby?: boolean;
      isBraveWallet?: boolean;
      isOKXWallet?: boolean;
      providers?: unknown[];
      [key: string]: unknown;
    };
  }
}

interface KnownWallet {
  id: string;
  name: string;
  icon: string;
  installUrl: string;
  flags?: string[];
  excludeFlags?: string[];
  matchEntries?: string[];
}

const KNOWN_WALLETS: KnownWallet[] = [
  {
    id: "metaMask",
    name: "MetaMask",
    icon: "🦊",
    installUrl: "https://metamask.io/download/",
    flags: ["isMetaMask"],
    // Brave masquerades as MetaMask, so exclude it when flag-scanning.
    excludeFlags: ["isBraveWallet", "isRabby"],
    matchEntries: ["metamask", "io.metamask"],
  },
  {
    id: "coinbaseWallet",
    name: "Coinbase Wallet",
    icon: "🔵",
    installUrl: "https://www.coinbase.com/wallet",
    flags: ["isCoinbaseWallet"],
    matchEntries: ["coinbase", "com.coinbase"],
  },
  {
    id: "rabby",
    name: "Rabby",
    icon: "🐰",
    installUrl: "https://rabby.io/",
    flags: ["isRabby"],
    matchEntries: ["rabby"],
  },
  {
    id: "braveWallet",
    name: "Brave Wallet",
    icon: "🦁",
    installUrl: "https://brave.com/wallet/",
    flags: ["isBraveWallet"],
    matchEntries: ["brave"],
  },
];

function matchKnownWallet(info: EIP6963ProviderDetail["info"]): KnownWallet | undefined {
  const search = `${info.rdns} ${info.name}`.toLowerCase();
  return KNOWN_WALLETS.find((wallet) =>
    wallet.matchEntries?.some((entry) => search.includes(entry))
  );
}

function findFlaggedProvider(wallet: KnownWallet): EIP1193Provider | undefined {
  if (typeof window === "undefined") return undefined;
  const ethereum = window.ethereum as
    | (Window["ethereum"] & Record<string, unknown>)
    | undefined;
  const providers = ((ethereum?.providers ?? []) as Record<string, unknown>[]) ?? [];
  const providerSet = ethereum ? [ethereum, ...providers] : providers;
  return providerSet.find(
    (provider) =>
      wallet.flags?.some((flag) => provider[flag] === true) &&
      !wallet.excludeFlags?.some((flag) => provider[flag] === true)
  ) as EIP1193Provider | undefined;
}

function connectorById(
  connectors: readonly Connector[],
  id: string
): Connector | undefined {
  return connectors.find((connector) => connector.id === id);
}

function buildWalletList(
  connectors: readonly Connector[],
  eip6963Queue: EIP6963ProviderDetail[]
): WalletInfo[] {
  const walletConnectConnector = connectorById(connectors, "walletConnect");

  const installed: WalletInfo[] = [];
  const seenNames = new Set<string>();

  for (const detail of eip6963Queue) {
    const { info, provider } = detail;
    const known = matchKnownWallet(info);
    const id = known?.id ?? info.rdns;

    installed.push({
      id,
      name: info.name,
      icon: info.icon,
      installed: true,
      provider: provider as EIP1193Provider,
      connector: known ? connectorById(connectors, known.id) : undefined,
      connectorFn: injected({
        target: {
          id,
          name: info.name,
          icon: info.icon,
          provider: () => provider as EIP1193Provider,
        },
      }),
      injectedDetected: true,
      installUrl: known?.installUrl,
    });
    seenNames.add(info.name.toLowerCase());
  }

  for (const wallet of KNOWN_WALLETS) {
    if (seenNames.has(wallet.name.toLowerCase())) continue;
    const provider = findFlaggedProvider(wallet);
    if (!provider) continue;

    installed.push({
      id: wallet.id,
      name: wallet.name,
      icon: wallet.icon,
      installed: true,
      provider,
      connector: connectorById(connectors, wallet.id),
      connectorFn: injected({
        target: {
          id: wallet.id,
          name: wallet.name,
          icon: wallet.icon,
          provider: () => provider,
        },
      }),
      injectedDetected: true,
      installUrl: wallet.installUrl,
    });
    seenNames.add(wallet.name.toLowerCase());
  }

  const notInstalled: WalletInfo[] = KNOWN_WALLETS.filter(
    (wallet) => !seenNames.has(wallet.name.toLowerCase())
  ).map((wallet) => ({
    id: wallet.id,
    name: wallet.name,
    icon: wallet.icon,
    installed: false,
    installUrl: wallet.installUrl,
  }));

  const walletConnectEntry: WalletInfo | undefined = walletConnectConnector
    ? {
        id: "walletConnect",
        name: "WalletConnect",
        icon: "🔗",
        installed: true,
        connector: walletConnectConnector,
        isWalletConnect: true,
      }
    : undefined;

  return [
    ...installed,
    ...(walletConnectEntry ? [walletConnectEntry] : []),
    ...notInstalled,
  ];
}

export function useWalletDiscovery(connectors: readonly Connector[]) {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(true);
  const [reconnect, setReconnect] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const eip6963Queue: EIP6963ProviderDetail[] = [];

    function handleAnnounce(event: Event) {
      const detail = (event as CustomEvent).detail as
        | EIP6963ProviderDetail
        | undefined;
      if (detail?.info && detail?.provider) eip6963Queue.push(detail);
    }

    window.addEventListener("eip6963:announceProvider", handleAnnounce);
    window.dispatchEvent(new CustomEvent("eip6963:requestProvider"));

    const timer = setTimeout(() => {
      if (cancelled) return;
      window.removeEventListener("eip6963:announceProvider", handleAnnounce);
      const discovered = buildWalletList(connectors, eip6963Queue);
      if (!cancelled) {
        setWallets(discovered);
        setIsDiscovering(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("eip6963:announceProvider", handleAnnounce);
    };
  }, [connectors, reconnect]);

  const refreshDiscovery = useCallback(() => {
    setIsDiscovering(true);
    setReconnect((x) => x + 1);
  }, []);

  return { wallets, isDiscovering, refreshDiscovery };
}