import { createPublicClient, http, type Hash } from 'viem';
import { getNetwork } from './networks';
import { toast } from 'sonner';

export interface TransactionDetails {
  hash: Hash;
  to: `0x${string}` | null;
  input: `0x${string}`;
  blockNumber: bigint;
  blockHash: Hash;
  transactionIndex: number;
  from: `0x${string}`;
  value: bigint;
  gas: bigint;
  gasPrice: bigint;
  nonce: number;
}

export class TransactionFetcher {
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

  async fetchTransaction(txHash: Hash, networkId: string): Promise<TransactionDetails> {
    try {
      toast.loading('Fetching transaction details...', { id: 'tx-fetch' });

      const client = this.getClient(networkId);
      const transaction = await client.getTransaction({ hash: txHash });

      if (!transaction) {
        toast.error('Transaction not found', { id: 'tx-fetch' });
        throw new Error('Transaction not found');
      }

      toast.success('Transaction details fetched', {
        id: 'tx-fetch',
        description: `Block: ${transaction.blockNumber?.toString()}`,
      });

      return {
        hash: transaction.hash,
        to: transaction.to,
        input: transaction.input,
        blockNumber: transaction.blockNumber!,
        blockHash: transaction.blockHash!,
        transactionIndex: transaction.transactionIndex!,
        from: transaction.from,
        value: transaction.value,
        gas: transaction.gas,
        gasPrice: transaction.gasPrice!,
        nonce: transaction.nonce,
      };
    } catch (error) {
      const errorMessage = `Failed to fetch transaction: ${error instanceof Error ? error.message : 'Unknown error'}`;
      toast.error(errorMessage, { id: 'tx-fetch' });
      throw new Error(errorMessage);
    }
  }

  async validateTransaction(txHash: string, networkId: string): Promise<boolean> {
    try {
      if (!txHash.startsWith('0x') || txHash.length !== 66) {
        return false;
      }

      await this.fetchTransaction(txHash as Hash, networkId);
      return true;
    } catch {
      return false;
    }
  }
}

export const transactionFetcher = new TransactionFetcher();
