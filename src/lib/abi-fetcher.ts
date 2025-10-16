import { getNetwork, type NetworkConfig } from './networks';
import { abiCache } from './abi-cache';
import { proxyDetector } from './proxy-detector';
import { toast } from 'sonner';

export interface ContractInfo {
  contractAddress: `0x${string}`;
  contractName: string;
  abi: string;
  isVerified: boolean;
  isProxy?: boolean;
  implementationAddress?: `0x${string}`;
  proxyType?: 'eip1967' | 'eip1822' | 'openzeppelin' | 'custom';
}

export interface ContractFetchResult {
  contractInfo: ContractInfo;
  cacheUsed: boolean;
}

export class AbiFetcher {
  private async fetchAbiFromEtherscan(
    contractAddress: `0x${string}`,
    network: NetworkConfig
  ): Promise<ContractInfo> {
    const apiKey = network.explorerApiKey;
    const url = `${network.explorerApiUrl}?chainid=${network.chainId}&module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== '1') {
      throw new Error(data.message || 'Failed to fetch contract data');
    }

    const contractData = data.result[0];

    if (!contractData.ABI || contractData.ABI === 'Contract source code not verified') {
      throw new Error('Contract is not verified or ABI is not available');
    }

    // Parse ABI to validate it
    try {
      JSON.parse(contractData.ABI);
    } catch {
      throw new Error('Invalid ABI format received from explorer');
    }

    return {
      contractAddress,
      contractName: contractData.ContractName || 'Unknown',
      abi: contractData.ABI,
      isVerified: true,
    };
  }

  async fetchContractAbi(
    contractAddress: `0x${string}`,
    networkId: string
  ): Promise<ContractFetchResult> {
    try {
      const network = getNetwork(networkId);

      // First, check the cache
      const cachedAbi = await abiCache.getCachedAbi(contractAddress, network.chainId);
      if (cachedAbi) {
        toast.success(`Using cached ABI for ${cachedAbi.contractName}`, {
          description: 'ABI loaded from cache - instant decode!',
        });
        return {
          contractInfo: cachedAbi,
          cacheUsed: true,
        };
      }

      toast.loading('Analyzing contract...', { id: 'contract-fetch' });

      // Check if this is a proxy contract
      const proxyInfo = await proxyDetector.detectProxy(contractAddress, networkId);

      let contractInfo: ContractInfo;
      let contractType: 'normal' | 'proxy' = 'normal';

      if (proxyInfo.isProxy && proxyInfo.implementationAddress) {
        toast.loading('Proxy detected - fetching implementation ABI...', { id: 'contract-fetch' });

        // Fetch ABI from implementation contract
        const implContractInfo = await this.fetchAbiFromEtherscan(
          proxyInfo.implementationAddress,
          network
        );

        contractInfo = {
          ...implContractInfo,
          contractAddress, // Keep original proxy address
          contractName: `${implContractInfo.contractName} (Proxy)`,
          isProxy: true,
          implementationAddress: proxyInfo.implementationAddress,
          proxyType: proxyInfo.proxyType,
        };
        contractType = 'proxy';

        toast.success(`Proxy contract ABI loaded`, {
          id: 'contract-fetch',
          description: `${proxyInfo.proxyType?.toUpperCase()} proxy • Implementation: ${implContractInfo.contractName}`,
        });
      } else if (proxyInfo.isProxy && !proxyInfo.implementationAddress) {
        toast.warning('Custom proxy detected - using proxy ABI', { id: 'contract-fetch' });

        // For custom proxies where we can't determine implementation, use proxy's own ABI
        const proxyContractInfo = await this.fetchAbiFromEtherscan(contractAddress, network);

        contractInfo = {
          ...proxyContractInfo,
          isProxy: true,
          proxyType: proxyInfo.proxyType,
        };
        contractType = 'proxy';
      } else {
        toast.loading('Fetching contract ABI...', { id: 'contract-fetch' });

        // Normal contract - fetch ABI directly
        contractInfo = await this.fetchAbiFromEtherscan(contractAddress, network);

        toast.success(`ABI loaded for ${contractInfo.contractName}`, {
          id: 'contract-fetch',
          description: 'Contract verified on Etherscan',
        });
      }

      // Cache the ABI for future use
      try {
        await abiCache.setCachedAbi(
          contractAddress,
          network.chainId,
          contractInfo,
          contractType,
          contractInfo.implementationAddress
        );
      } catch (cacheError) {
        toast.warning('Failed to cache ABI', {
          description: 'ABI will be fetched again next time',
        });
      }

      return {
        contractInfo,
        cacheUsed: false,
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch contract ABI: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async validateContractAddress(address: string): Promise<boolean> {
    try {
      // Basic validation for Ethereum address format
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;
      return addressRegex.test(address);
    } catch {
      return false;
    }
  }

  // Method to check if address is a contract (not EOA)
  async isContract(contractAddress: `0x${string}`, networkId: string): Promise<boolean> {
    try {
      const network = getNetwork(networkId);
      const response = await fetch(network.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getCode',
          params: [contractAddress, 'latest'],
          id: 1,
        }),
      });

      const data = await response.json();
      return data.result !== '0x' && data.result !== null;
    } catch {
      return false;
    }
  }

  // Cache management methods
  async getCacheStats(): Promise<{ totalEntries: number; expiredEntries: number }> {
    return await abiCache.getCacheStats();
  }

  async clearCache(): Promise<void> {
    try {
      await abiCache.clearExpiredEntries();
    } catch (error) {
      throw error;
    }
  }

  async removeCachedAbi(contractAddress: `0x${string}`, networkId: string): Promise<void> {
    try {
      const network = getNetwork(networkId);
      await abiCache.removeCachedAbi(contractAddress, network.chainId);
    } catch (error) {
      throw error;
    }
  }
}

export const abiFetcher = new AbiFetcher();
