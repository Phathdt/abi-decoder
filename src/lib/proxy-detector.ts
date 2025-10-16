import { createPublicClient, http, type Hash } from 'viem';
import { getNetwork } from './networks';

export interface ProxyInfo {
  isProxy: boolean;
  implementationAddress?: `0x${string}`;
  proxyType?: 'eip1967' | 'eip1822' | 'openzeppelin' | 'custom';
}

export class ProxyDetector {
  private clients: Map<string, any> = new Map();

  private getClient(networkId: string) {
    if (!this.clients.has(networkId)) {
      const network = getNetwork(networkId);
      const client = createPublicClient({
        chain: network.chain,
        transport: http(network.rpcUrl),
      });
      this.clients.set(networkId, client);
    }
    return this.clients.get(networkId);
  }

  async detectProxy(contractAddress: `0x${string}`, networkId: string): Promise<ProxyInfo> {
    try {
      const client = this.getClient(networkId);

      // Check for EIP-1967 proxy (most common)
      // Storage slot: keccak256("eip1967.proxy.implementation") - 1
      // = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
      const eip1967Slot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

      const implementationAddress = await client.getStorageAt({
        address: contractAddress,
        slot: eip1967Slot as Hash,
      });

      if (
        implementationAddress &&
        implementationAddress !==
          '0x0000000000000000000000000000000000000000000000000000000000000000'
      ) {
        const cleanAddress = `0x${implementationAddress.slice(-40)}` as `0x${string}`;

        return {
          isProxy: true,
          implementationAddress: cleanAddress,
          proxyType: 'eip1967',
        };
      }

      // Check for EIP-1822 proxy (UUPS)
      // Storage slot: keccak256("PROXIABLE") = 0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7
      const eip1822Slot = '0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7';

      const uupsImplementation = await client.getStorageAt({
        address: contractAddress,
        slot: eip1822Slot as Hash,
      });

      if (
        uupsImplementation &&
        uupsImplementation !== '0x0000000000000000000000000000000000000000000000000000000000000000'
      ) {
        const cleanAddress = `0x${uupsImplementation.slice(-40)}` as `0x${string}`;

        return {
          isProxy: true,
          implementationAddress: cleanAddress,
          proxyType: 'eip1822',
        };
      }

      // Check for OpenZeppelin proxy pattern
      // Try to call implementation() function (selector: 0x5c60da1b)
      try {
        const implementationResult = await client.call({
          to: contractAddress,
          data: '0x5c60da1b' as Hash, // implementation() selector
        });

        if (
          implementationResult.data &&
          implementationResult.data !== '0x' &&
          implementationResult.data.length >= 66
        ) {
          const cleanAddress = `0x${implementationResult.data.slice(-40)}` as `0x${string}`;

          return {
            isProxy: true,
            implementationAddress: cleanAddress,
            proxyType: 'openzeppelin',
          };
        }
      } catch {
        // implementation() function doesn't exist or failed, continue checking
      }

      // Check for other common proxy patterns by looking at bytecode
      const bytecode = await client.getBytecode({
        address: contractAddress,
      });

      if (bytecode && bytecode.length > 0) {
        // Look for common proxy bytecode patterns
        const bytecodeStr = bytecode.toLowerCase();

        // Check for delegatecall patterns (common in proxies)
        if (
          bytecodeStr.includes('f4') || // DELEGATECALL opcode
          bytecodeStr.includes('3d3d3d3d') || // Common proxy initialization pattern
          bytecodeStr.includes('363d3d373d3d3d') // Minimal proxy pattern
        ) {
          // For custom proxies, we can't easily determine the implementation
          // Would need more sophisticated analysis or specific knowledge
          return {
            isProxy: true,
            proxyType: 'custom',
          };
        }
      }

      return { isProxy: false };
    } catch (error) {
      // If we can't determine, assume it's not a proxy
      return { isProxy: false };
    }
  }
}

export const proxyDetector = new ProxyDetector();
