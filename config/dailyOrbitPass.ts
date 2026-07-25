import type { Address } from "viem";

export const DAILY_ORBIT_PASS_ADDRESS =
  "0x602d9DAFB35FCAf7A8e0D0DA871207711306EBE8" as Address;

export const DAILY_ORBIT_PASS_ABI = [
  {
    type: "function",
    name: "activateDailyOrbit",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "hasActivePass",
    stateMutability: "view",
    inputs: [
      {
        name: "pilot",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
  },
  {
    type: "function",
    name: "secondsUntilReset",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "totalActivations",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "totalUniquePilots",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
  {
    type: "event",
    name: "DailyOrbitActivated",
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: "pilot",
        type: "address",
      },
      {
        indexed: true,
        name: "dayId",
        type: "uint256",
      },
      {
        indexed: false,
        name: "activatedAt",
        type: "uint256",
      },
    ],
  },
  {
    type: "error",
    name: "OrbitAlreadyActiveToday",
    inputs: [],
  },
] as const;