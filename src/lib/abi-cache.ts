import { type ContractInfo } from './abi-fetcher';

interface CachedAbiEntry {
  contractAddress: `0x${string}`;
  chainId: number;
  contractInfo: ContractInfo;
  contractType: 'normal' | 'proxy';
  implementationAddress?: `0x${string}`; // For proxy contracts
  cachedAt: number; // timestamp
  expiresAt: number; // timestamp
}

class AbiCacheService {
  private dbName = 'abi-decoder-cache';
  private dbVersion = 2; // Increment version for schema change
  private storeName = 'abi-cache';
  private db: IDBDatabase | null = null;

  // Cache expiry times
  private normalContractExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days for normal contracts
  private proxyContractExpiry = 2 * 60 * 60 * 1000; // 2 hours for proxy contracts

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });

          // Create indexes for efficient querying
          store.createIndex('contractAddress', 'contractAddress', { unique: false });
          store.createIndex('chainId', 'chainId', { unique: false });
          store.createIndex('contractAndChain', ['contractAddress', 'chainId'], { unique: true });
        }
      };
    });
  }

  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Failed to initialize database');
    }
    return this.db;
  }

  private getCacheKey(contractAddress: `0x${string}`, chainId: number): string {
    return `${contractAddress.toLowerCase()}-${chainId}`;
  }

  async getCachedAbi(
    contractAddress: `0x${string}`,
    chainId: number
  ): Promise<ContractInfo | null> {
    try {
      const db = await this.ensureDb();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('contractAndChain');

      return new Promise((resolve, reject) => {
        const request = index.get([contractAddress.toLowerCase(), chainId]);

        request.onerror = () => {
          reject(request.error);
        };

        request.onsuccess = () => {
          const result = request.result as CachedAbiEntry | undefined;

          if (!result) {
            resolve(null);
            return;
          }

          // Check if cache entry is expired
          if (Date.now() > result.expiresAt) {
            // Entry is expired, remove it and return null
            this.removeCachedAbi(contractAddress, chainId).catch(() => {});
            resolve(null);
            return;
          }

          resolve(result.contractInfo);
        };
      });
    } catch (error) {
      return null;
    }
  }

  async setCachedAbi(
    contractAddress: `0x${string}`,
    chainId: number,
    contractInfo: ContractInfo,
    contractType: 'normal' | 'proxy' = 'normal',
    implementationAddress?: `0x${string}`
  ): Promise<void> {
    try {
      const db = await this.ensureDb();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const now = Date.now();
      const expiry =
        contractType === 'proxy' ? this.proxyContractExpiry : this.normalContractExpiry;

      const cacheEntry: CachedAbiEntry = {
        contractAddress: contractAddress.toLowerCase() as `0x${string}`,
        chainId,
        contractInfo,
        contractType,
        implementationAddress: implementationAddress?.toLowerCase() as `0x${string}`,
        cachedAt: now,
        expiresAt: now + expiry,
      };

      // Add id field for the keyPath
      const entryWithId = {
        id: this.getCacheKey(contractAddress, chainId),
        ...cacheEntry,
      };

      return new Promise((resolve, reject) => {
        const request = store.put(entryWithId);

        request.onerror = () => {
          reject(request.error);
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      // Silently fail cache operations
      throw error;
    }
  }

  async removeCachedAbi(contractAddress: `0x${string}`, chainId: number): Promise<void> {
    try {
      const db = await this.ensureDb();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const key = this.getCacheKey(contractAddress, chainId);

      return new Promise((resolve, reject) => {
        const request = store.delete(key);

        request.onerror = () => {
          reject(request.error);
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      // Silently handle cache errors
    }
  }

  async clearExpiredEntries(): Promise<void> {
    try {
      const db = await this.ensureDb();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const now = Date.now();

      return new Promise((resolve, reject) => {
        const request = store.openCursor();

        request.onerror = () => {
          reject(request.error);
        };

        request.onsuccess = event => {
          const cursor = (event.target as IDBRequest).result;

          if (cursor) {
            const entry = cursor.value as CachedAbiEntry & { id: string };

            if (now > entry.expiresAt) {
              cursor.delete();
            }

            cursor.continue();
          } else {
            resolve();
          }
        };
      });
    } catch (error) {
      // Silently handle cache errors
    }
  }

  async getCacheStats(): Promise<{ totalEntries: number; expiredEntries: number }> {
    try {
      const db = await this.ensureDb();
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);

      const now = Date.now();
      let totalEntries = 0;
      let expiredEntries = 0;

      return new Promise((resolve, reject) => {
        const request = store.openCursor();

        request.onerror = () => {
          reject(request.error);
        };

        request.onsuccess = event => {
          const cursor = (event.target as IDBRequest).result;

          if (cursor) {
            totalEntries++;
            const entry = cursor.value as CachedAbiEntry;

            if (now > entry.expiresAt) {
              expiredEntries++;
            }

            cursor.continue();
          } else {
            resolve({ totalEntries, expiredEntries });
          }
        };
      });
    } catch (error) {
      return { totalEntries: 0, expiredEntries: 0 };
    }
  }
}

export const abiCache = new AbiCacheService();

// Initialize cache on module load
abiCache.init().catch(() => {});

// Clean up expired entries periodically (every hour)
setInterval(
  () => {
    abiCache.clearExpiredEntries().catch(() => {});
  },
  60 * 60 * 1000
);
