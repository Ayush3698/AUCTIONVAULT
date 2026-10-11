import { createConfig, http, injected } from "wagmi";
import { walletConnect } from "wagmi/connectors";
import type { EIP1193Provider } from "viem";
import { sepolia } from "wagmi/chains";

export const SEPOLIA_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

export const WALLET_CONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

type InjectedParameters = NonNullable<Parameters<typeof injected>[0]>;
type Target = NonNullable<InjectedParameters["target"]>;

interface EIP6963ProviderDetail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: unknown;
}

interface ProviderMatch {
  rdns?: string;
  requiredFlags?: string[];
  excludeFlags?: string[];
}

type ProviderLike = Record<string, unknown> & Partial<EIP1193Provider>;

// EIP-6963 store keyed by rdns so every connector can resolve the exact
// provider object announced for its wallet instead of guessing from
// `window.ethereum` (which can be a different installed wallet).
const eip6963Providers = new Map<string, ProviderLike>();

function registerEip6963Provider(detail: EIP6963ProviderDetail): void {
  if (detail?.info?.rdns && detail?.provider) {
    eip6963Providers.set(detail.info.rdns, detail.provider as ProviderLike);
  }
}

// Wire up EIP-6963 discovery as soon as this module loads in the browser.
// Guarded so SSR never touches `window`.
if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (event: Event) => {
    const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
    registerEip6963Provider(detail);
  });
  window.dispatchEvent(new CustomEvent("eip6963:requestProvider"));
}

function matchesProvider(provider: ProviderLike, match: ProviderMatch): boolean {
  if (
    match.requiredFlags &&
    match.requiredFlags.some((flag) => provider[flag] !== true)
  ) {
    return false;
  }
  if (
    match.excludeFlags &&
    match.excludeFlags.some((flag) => provider[flag] === true)
  ) {
    return false;
  }
  return true;
}

function getWindowProviders(win: unknown): ProviderLike[] {
  const ethereum = (win as { ethereum?: ProviderLike } | undefined)?.ethereum;
  const providers = ((ethereum?.providers ?? []) as ProviderLike[]) ?? [];
  return ethereum ? [ethereum, ...providers] : providers;
}

function resolveInjectedProvider(
  win: unknown,
  match: ProviderMatch
): EIP1193Provider | undefined {
  // Prefer the exact provider announced via EIP-6963 for the wallet's rdns.
  if (match.rdns) {
    const pinned = eip6963Providers.get(match.rdns);
    if (pinned) return pinned as EIP1193Provider;
  }
  // Fall back to flag-based scanning, excluding impersonators (e.g. Brave
  // advertises `isMetaMask` for compatibility).
  for (const provider of eip6963Providers.values()) {
    if (matchesProvider(provider, match)) return provider as EIP1193Provider;
  }
  return getWindowProviders(win).find((provider) =>
    matchesProvider(provider, match)
  ) as EIP1193Provider | undefined;
}

function customTarget(
  id: string,
  name: string,
  icon: string,
  match: ProviderMatch
): Target {
  return {
    id,
    name,
    icon,
    provider: (win?: unknown) => resolveInjectedProvider(win, match),
  } as unknown as Target;
}

export const walletConfig = createConfig({
  chains: [sepolia],
  connectors: [
    injected({
      target: customTarget("metaMask", "MetaMask", "🦊", {
        rdns: "io.metamask",
        requiredFlags: ["isMetaMask"],
        excludeFlags: ["isBraveWallet", "isRabby"],
      }),
      shimDisconnect: true,
    }),
    injected({
      target: customTarget("coinbaseWallet", "Coinbase Wallet", "🔵", {
        rdns: "com.coinbase.wallet",
        requiredFlags: ["isCoinbaseWallet"],
      }),
      shimDisconnect: true,
    }),
    injected({
      target: customTarget("rabby", "Rabby", "🐰", {
        rdns: "com.rabby",
        requiredFlags: ["isRabby"],
      }),
      shimDisconnect: true,
    }),
    injected({
      target: customTarget("braveWallet", "Brave Wallet", "🦁", {
        rdns: "com.brave.wallet",
        requiredFlags: ["isBraveWallet"],
      }),
      shimDisconnect: true,
    }),
    ...(WALLET_CONNECT_PROJECT_ID
      ? [walletConnect({ projectId: WALLET_CONNECT_PROJECT_ID })]
      : []),
  ],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC_URL),
  },
});