"use client";

import Link from "next/link";

import {
  useAccount,
  useReadContract,
  useSwitchChain,
} from "wagmi";

import OrbitGame from "@/components/game/OrbitGame";

import {
  DAILY_ORBIT_PASS_ABI,
  DAILY_ORBIT_PASS_ADDRESS,
} from "@/config/dailyOrbitPass";

const BASE_CHAIN_ID = 8453;

export default function PlayGate() {
  const {
    address,
    chainId,
    isConnected,
  } = useAccount();

  const {
    switchChain,
    isPending: isSwitching,
  } = useSwitchChain();

  const isWrongNetwork =
    isConnected && chainId !== BASE_CHAIN_ID;

  const {
    data: hasActivePass,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: DAILY_ORBIT_PASS_ADDRESS,
    abi: DAILY_ORBIT_PASS_ABI,
    functionName: "hasActivePass",
    args: address ? [address] : undefined,
    chainId: BASE_CHAIN_ID,
    query: {
      enabled:
        Boolean(address) &&
        chainId === BASE_CHAIN_ID,
      refetchOnWindowFocus: true,
    },
  });

  if (!isConnected) {
    return (
      <AccessCard
        label="Wallet Required"
        title="Connect Your Pilot Wallet"
        description="Return home and connect your wallet before entering today’s Orbit."
      />
    );
  }

  if (isWrongNetwork) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.24em] text-blue-300">
          Wrong Network
        </p>

        <h2 className="mt-3 text-2xl font-black text-white">
          Switch to Base Mainnet
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Base Orbit runs on Base Mainnet.
        </p>

        <button
          type="button"
          onClick={() =>
            switchChain({
              chainId: BASE_CHAIN_ID,
            })
          }
          disabled={isSwitching}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#0052FF] to-[#3B82F6] py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSwitching
            ? "Switching..."
            : "Switch to Base"}
        </button>

        <HomeLink />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-400/20 border-t-blue-400" />

        <p className="mt-5 text-xs uppercase tracking-[0.24em] text-blue-300">
          Checking Daily Pass
        </p>

        <h2 className="mt-3 text-2xl font-black text-white">
          Reading Base Mainnet
        </h2>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-400/20 bg-red-500/5 p-6 text-center backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.24em] text-red-300">
          Network Error
        </p>

        <h2 className="mt-3 text-2xl font-black text-white">
          Pass Status Could Not Be Checked
        </h2>

        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="mt-6 w-full rounded-2xl border border-blue-400/30 bg-blue-500/10 py-3 font-bold text-blue-200"
        >
          Try Again
        </button>

        <HomeLink />
      </section>
    );
  }

  if (!hasActivePass) {
    return (
      <AccessCard
        label="Orbit Locked"
        title="Activate Today’s Orbit Pass"
        description="One gas-only Base Mainnet transaction unlocks unlimited runs until the next UTC reset."
      />
    );
  }

  return <OrbitGame />;
}

type AccessCardProps = {
  label: string;
  title: string;
  description: string;
};

function AccessCard({
  label,
  title,
  description,
}: AccessCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.24em] text-blue-300">
        {label}
      </p>

      <h2 className="mt-3 text-2xl font-black text-white">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        {description}
      </p>

      <Link
        href="/"
        className="mt-6 block w-full rounded-2xl bg-gradient-to-r from-[#0052FF] to-[#3B82F6] py-4 text-center font-bold text-white transition hover:scale-[1.02] active:scale-[0.98]"
      >
        Return Home
      </Link>
    </section>
  );
}

function HomeLink() {
  return (
    <Link
      href="/"
      className="mt-4 block text-sm text-slate-400 transition hover:text-white"
    >
      ← Return Home
    </Link>
  );
}