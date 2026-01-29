export const skaleBaseSepolia: any = {
  id: 324705682,
  name: "SKALE Base Sepolia Testnet",
  rpcUrls: {
    default: {
      http: ["https://base-sepolia-testnet.skalenodes.com/v1/base-testnet"]
    }
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://base-sepolia-testnet-explorer.skalenodes.com/"
    }
  },
  nativeCurrency: {
    name: "Credits",
    decimals: 18,
    symbol: "CRED"
  }
};

export const skaleBase: any = {
  id: 1187947933,
  name: 'SKALE Base',
  nativeCurrency: { name: 'Credits', symbol: 'CREDIT', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://skale-base.skalenodes.com/v1/base'],
      webSocket: ['wss://skale-base.skalenodes.com/v1/ws/base'],
    },
  },
  blockExplorers: {
    default: {
      name: 'SKALE Explorer',
      url: 'https://skale-base-explorer.skalenodes.com/',
    },
  },
  testnet: false,
};
