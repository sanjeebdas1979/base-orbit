"use client";

import { useEffect } from "react";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import PrimaryButton from "@/components/shared/PrimaryButton";

import {
  DAILY_ORBIT_PASS_ABI,
  DAILY_ORBIT_PASS_ADDRESS,
} from "@/config/dailyOrbitPass";

const BASE_CHAIN_ID = 8453;

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "shortMessage" in error &&
    typeof error.shortMessage === "string"
  ) {
    if (
      error.shortMessage.includes(
        "User rejected",
      )
    ) {
      return "Transaction cancelled in your wallet.";
    }

    if (
      error.shortMessage.includes(
        "OrbitAlreadyActiveToday",
      )
    ) {
      return "Your Daily Orbit Pass is already active.";
    }

    return error.shortMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "The transaction could not be completed.";
}

export default function OrbitAccess() {
  const {
    address,
    chainId,
    isConnected,
  } = useAccount();

  const {
    connectors,
    connect,
    isPending: isConnecting,
    error: connectError,
  } = useConnect();

  const { disconnect } = useDisconnect();

  const {
    switchChain,
    isPending: isSwitching,
  } = useSwitchChain();

  const writeContract = useWriteContract();

  const isWrongNetwork =
    isConnected && chainId !== BASE_CHAIN_ID;

  const {
    data: hasActivePass,
    isLoading: isCheckingPass,
    error: passReadError,
    refetch: refetchPass,
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
    },
  });

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    chainId: BASE_CHAIN_ID,
    hash: writeContract.data,
    confirmations: 1,
  });

  useEffect(() => {
    if (isConfirmed) {
      void refetchPass();
    }
  }, [isConfirmed, refetchPass]);

  const connector = connectors[0];

  const activatePass = () => {
    writeContract.mutate({
      address: DAILY_ORBIT_PASS_ADDRESS,
      abi: DAILY_ORBIT_PASS_ABI,
      functionName: "activateDailyOrbit",
      chainId: BASE_CHAIN_ID,
    });
  };

  if (!isConnected) {
    return (
      <div className="space-y-3">
        <PrimaryButton
          onClick={() => {
            if (connector) {
              connect({ connector });
            }
          }}
          disabled={
            !connector || isConnecting
          }
        >
          {isConnecting
            ? "Connecting..."
            : "Connect Wallet"}
        </PrimaryButton>

        {connectError && (
          <p className="text-center text-sm text-red-400">
            {getErrorMessage(connectError)}
          </p>
        )}
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <div className="space-y-3">
        <PrimaryButton
          onClick={() =>
            switchChain({
              chainId: BASE_CHAIN_ID,
            })
          }
          disabled={isSwitching}
        >
          {isSwitching
            ? "Switching..."
            : "Switch to Base"}
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

  const transactionError =
    writeContract.error ?? receiptError;

  const isActivating =
    writeContract.isPending || isConfirming;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-blue-300">
              Pilot Connected
            </p>

            <p className="mt-1 font-medium text-white">
              {address
                ? shortenAddress(address)
                : "Connected"}
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

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-xl">
        {isCheckingPass ? (
          <>
            <p className="text-xs uppercase tracking-[0.22em] text-blue-300">
              Checking Orbit Pass
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Reading Base Mainnet
            </h2>

            <p className="mt-3 text-sm text-slate-400">
              Checking today&apos;s activation status...
            </p>
          </>
        ) : hasActivePass ? (
          <>
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-300">
              Daily Pass Active
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Today&apos;s Orbit Is Unlocked
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Unlimited runs are available until the
              next UTC reset.
            </p>

            <a
              href="/play"
              className="mt-5 block w-full rounded-2xl bg-gradient-to-r from-[#0052FF] to-[#3B82F6] py-4 text-center text-lg font-bold text-white transition hover:scale-[1.02] active:scale-[0.98]"
            >
              Play Base Orbit
            </a>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.22em] text-blue-300">
              Power Today&apos;s Orbit
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Activate Daily Orbit Pass
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              One Base Mainnet transaction unlocks
              unlimited runs for today. No payment is
              sent to the contract—you only pay the
              network gas fee.
            </p>

            <button
              type="button"
              onClick={activatePass}
              disabled={isActivating}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#0052FF] to-[#3B82F6] py-4 text-lg font-bold text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            >
              {writeContract.isPending
                ? "Confirm in Wallet..."
                : isConfirming
                  ? "Activating on Base..."
                  : "Activate Daily Orbit"}
            </button>

            <div className="mt-4 space-y-2 text-left text-sm text-slate-400">
              <p>✓ Unlimited runs today</p>
              <p>✓ Daily challenge access</p>
              <p>✓ No contract payment required</p>
            </div>
          </>
        )}

        {passReadError && (
          <p className="mt-4 text-sm text-red-400">
            Could not read the pass status. Check your
            network connection and try again.
          </p>
        )}

        {transactionError && (
          <p className="mt-4 break-words text-sm text-red-400">
            {getErrorMessage(transactionError)}
          </p>
        )}

        {isConfirmed && !hasActivePass && (
          <p className="mt-4 text-sm text-blue-300">
            Transaction confirmed. Updating your pass...
          </p>
        )}
      </div>
    </section>
  );
}