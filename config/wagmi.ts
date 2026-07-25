import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { Attribution } from "ox/erc8021";

const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["bc_jm5fm9om"],
});

export const wagmiConfig = createConfig({
  chains: [base],

  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],

  transports: {
    [base.id]: http(),
  },

  dataSuffix: DATA_SUFFIX,

  ssr: true,
});