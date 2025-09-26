/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ETHERSCAN_API_KEY?: string;
  readonly VITE_ETHEREUM_RPC_URL?: string;
  readonly VITE_SEPOLIA_RPC_URL?: string;
  readonly VITE_BASE_RPC_URL?: string;
  readonly VITE_BASE_SEPOLIA_RPC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
