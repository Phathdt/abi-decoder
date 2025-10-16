import { type Chain } from 'viem';
import {
  mainnet,
  sepolia,
  base,
  baseSepolia,
  arbitrum,
  arbitrumSepolia,
  polygon,
  polygonAmoy,
  optimism,
  optimismSepolia,
  bsc,
  bscTestnet,
} from 'viem/chains';

export interface NetworkConfig {
  chain: Chain;
  rpcUrl: string;
  explorerApiUrl: string;
  explorerApiKey?: string;
  chainId: number;
  name: string;
  currency: string;
  isTestnet: boolean;
}

export const networks: Record<string, NetworkConfig> = {
  ethereum: {
    chain: mainnet,
    rpcUrl: import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://ethereum-rpc.publicnode.com',
    explorerApiUrl: 'https://api.etherscan.io/v2/api',
    explorerApiKey: import.meta.env.VITE_ETHERSCAN_API_KEY,
    chainId: 1,
    name: 'Ethereum Mainnet',
    currency: 'ETH',
    isTestnet: false,
  },
  sepolia: {
    chain: sepolia,
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerApiUrl: 'https://api.etherscan.io/v2/api',
    explorerApiKey: import.meta.env.VITE_ETHERSCAN_API_KEY,
    chainId: 11155111,
    name: 'Sepolia Testnet',
    currency: 'SepoliaETH',
    isTestnet: true,
  },
  base: {
    chain: base,
    rpcUrl: import.meta.env.VITE_BASE_RPC_URL || 'https://base-rpc.publicnode.com',
    explorerApiUrl: 'https://api.etherscan.io/v2/api',
    explorerApiKey: import.meta.env.VITE_ETHERSCAN_API_KEY,
    chainId: 8453,
    name: 'Base',
    currency: 'ETH',
    isTestnet: false,
  },
  baseSepolia: {
    chain: baseSepolia,
    rpcUrl: import.meta.env.VITE_BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com',
    explorerApiUrl: 'https://api.etherscan.io/v2/api',
    explorerApiKey: import.meta.env.VITE_ETHERSCAN_API_KEY,
    chainId: 84532,
    name: 'Base Sepolia',
    currency: 'SepoliaETH',
    isTestnet: true,
  },
  arbitrum: {
    chain: arbitrum,
    rpcUrl: import.meta.env.VITE_ARBITRUM_RPC_URL || 'https://arbitrum-one-rpc.publicnode.com',
    explorerApiUrl: 'https://api.etherscan.io/v2/api',
    explorerApiKey: import.meta.env.VITE_ETHERSCAN_API_KEY,
    chainId: 42161,
    name: 'Arbitrum One',
    currency: 'ETH',
    isTestnet: false,
  },
  arbitrumSepolia: {
    chain: arbitrumSepolia,
    rpcUrl:
      import.meta.env.VITE_ARBITRUM_SEPOLIA_RPC_URL ||
      'https://arbitrum-sepolia-rpc.publicnode.com',
    explorerApiUrl: 'https://api.etherscan.io/v2/api',
    explorerApiKey: import.meta.env.VITE_ETHERSCAN_API_KEY,
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    currency: 'SepoliaETH',
    isTestnet: true,
  },
  polygon: {
    chain: polygon,
    rpcUrl: import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com',
    explorerApiUrl: 'https://api.etherscan.io/v2/api',
    explorerApiKey: import.meta.env.VITE_ETHERSCAN_API_KEY,
    chainId: 137,
    name: 'Polygon Mainnet',
    currency: 'POL',
    isTestnet: false,
  },
  polygonAmoy: {
    chain: polygonAmoy,
    rpcUrl:
      import.meta.env.VITE_POLYGON_AMOY_RPC_URL || 'https://polygon-amoy-bor-rpc.publicnode.com',
    explorerApiUrl: 'https://api.etherscan.io/v2/api',
    explorerApiKey: import.meta.env.VITE_ETHERSCAN_API_KEY,
    chainId: 80002,
    name: 'Polygon Amoy',
    currency: 'POL',
    isTestnet: true,
  },
  optimism: {
    chain: optimism,
    rpcUrl: import.meta.env.VITE_OPTIMISM_RPC_URL || 'https://optimism-rpc.publicnode.com',
    explorerApiUrl: 'https://api.etherscan.io/v2/api',
    explorerApiKey: import.meta.env.VITE_ETHERSCAN_API_KEY,
    chainId: 10,
    name: 'Optimism Mainnet',
    currency: 'ETH',
    isTestnet: false,
  },
  optimismSepolia: {
    chain: optimismSepolia,
    rpcUrl:
      import.meta.env.VITE_OPTIMISM_SEPOLIA_RPC_URL ||
      'https://optimism-sepolia-rpc.publicnode.com',
    explorerApiUrl: 'https://api.etherscan.io/v2/api',
    explorerApiKey: import.meta.env.VITE_ETHERSCAN_API_KEY,
    chainId: 11155420,
    name: 'Optimism Sepolia',
    currency: 'SepoliaETH',
    isTestnet: true,
  },
  bsc: {
    chain: bsc,
    rpcUrl: import.meta.env.VITE_BSC_RPC_URL || 'https://bsc-rpc.publicnode.com',
    explorerApiUrl: 'https://api.etherscan.io/v2/api',
    explorerApiKey: import.meta.env.VITE_ETHERSCAN_API_KEY,
    chainId: 56,
    name: 'BNB Smart Chain',
    currency: 'BNB',
    isTestnet: false,
  },
  bscTestnet: {
    chain: bscTestnet,
    rpcUrl: import.meta.env.VITE_BSC_TESTNET_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com',
    explorerApiUrl: 'https://api.etherscan.io/v2/api',
    explorerApiKey: import.meta.env.VITE_ETHERSCAN_API_KEY,
    chainId: 97,
    name: 'BNB Testnet',
    currency: 'tBNB',
    isTestnet: true,
  },
};

export const defaultNetwork = 'ethereum';

export function getNetwork(networkId: string): NetworkConfig {
  return networks[networkId] || networks[defaultNetwork];
}

export function getAllNetworks(): Array<{ id: string; config: NetworkConfig }> {
  return Object.entries(networks).map(([id, config]) => ({ id, config }));
}
