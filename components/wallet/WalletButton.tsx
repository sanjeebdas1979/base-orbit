"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";

import PrimaryButton from "@/components/shared/PrimaryButton";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletButton() {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const baseChainId = 8453;
  const isWrongNetwork = isConnected && chainId !== baseChainId;
  const connector = connectors[0];

  if (!isConnected) {
    return (
      <div className="space-y-3">
        <PrimaryButton
          onClick={() => {
            if (connector) {
              connect({ connector });
            }
          }}
          disabled={!connector || isPending}
        >
          {isPending ? "Connecting..." : "Connect Wallet"}
        </PrimaryButton>

        {error && (
          <p className="text-center text-sm text-red-400">
            {error.message}
          </p>
        )}
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <div className="space-y-3">
        <PrimaryButton
          onClick={() => switchChain({ chainId: baseChainId })}
          disabled={isSwitching}
        >
          {isSwitching ? "Switching..." : "Switch to Base"}
        </PrimaryButton>

        <button
          type="button"
          onClick={() => disconnect()}
          className="w-full py-2 text-sm text-slate-400 transition hover:text-white"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-blue-300">
            Pilot connected
          </p>

          <p className="mt-1 font-medium text-white">
            {address ? shortenAddress(address) : "Connected"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => disconnect()}
          className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}