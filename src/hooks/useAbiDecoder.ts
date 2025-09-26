import { useState, useCallback } from 'react';
import { type Abi, type Hash } from 'viem';
import { parseAbi, decodeData, formatDecodedResult, findFunction } from '../lib/abi-decoder';
import { transactionFetcher, type TransactionDetails } from '../lib/transaction-fetcher';
import { abiFetcher, type ContractInfo } from '../lib/abi-fetcher';
import { defaultNetwork } from '../lib/networks';
import { toast } from 'sonner';

export type DecoderMode = 'manual' | 'fetch' | 'contract';

export interface AbiDecoderState {
  // Mode and network
  mode: DecoderMode;
  selectedNetwork: string;

  // Manual mode fields
  abiJson: string;
  encodedData: string;

  // Fetch mode fields
  txHash: string;

  // Contract mode fields
  contractAddress: string;
  payloadData: string;

  // Fetched data (populated when using fetch mode)
  transactionDetails: TransactionDetails | null;
  contractInfo: ContractInfo | null;

  // Common fields
  parsedAbi: Abi | null;
  functionInfo: {
    name: string;
    signature: string;
    selector: string;
  } | null;
  decodedResult: Array<{
    name: string;
    type: string;
    value: unknown;
    displayValue: string;
    parameterIndex: number;
  }> | null;
  isLoading: boolean;
  error: string | null;

  // Cache tracking
  cacheUsed: boolean;
}

export interface AbiDecoderActions {
  // Mode and network actions
  setMode: (mode: DecoderMode) => void;
  setSelectedNetwork: (network: string) => void;

  // Manual mode actions
  setAbiJson: (json: string) => void;
  setEncodedData: (data: string) => void;

  // Fetch mode actions
  setTxHash: (hash: string) => void;
  fetchTransactionData: () => Promise<void>;

  // Contract mode actions
  setContractAddress: (address: string) => void;
  setPayloadData: (data: string) => void;

  // Common actions
  decode: () => void;
  reset: () => void;
}

const initialState: AbiDecoderState = {
  // Mode and network
  mode: 'contract',
  selectedNetwork: defaultNetwork,

  // Manual mode fields
  abiJson: '',
  encodedData: '',

  // Fetch mode fields
  txHash: '',

  // Contract mode fields
  contractAddress: '',
  payloadData: '',

  // Fetched data
  transactionDetails: null,
  contractInfo: null,

  // Common fields
  parsedAbi: null,
  functionInfo: null,
  decodedResult: null,
  isLoading: false,
  error: null,

  // Cache tracking
  cacheUsed: false,
};

export function useAbiDecoder(): AbiDecoderState & AbiDecoderActions {
  const [state, setState] = useState<AbiDecoderState>(initialState);

  // Mode and network actions
  const setMode = useCallback((mode: DecoderMode) => {
    setState(prev => ({
      ...prev,
      mode,
      error: null,
      functionInfo: null,
      decodedResult: null,
      transactionDetails: null,
      contractInfo: null,
      cacheUsed: false,
    }));
  }, []);

  const setSelectedNetwork = useCallback((network: string) => {
    setState(prev => ({
      ...prev,
      selectedNetwork: network,
      error: null,
      functionInfo: null,
      decodedResult: null,
      transactionDetails: null,
      contractInfo: null,
      cacheUsed: false,
    }));
  }, []);

  // Manual mode actions
  const setAbiJson = useCallback((json: string) => {
    setState(prev => ({
      ...prev,
      abiJson: json,
      error: null,
      functionInfo: null,
      decodedResult: null,
    }));
  }, []);

  const setEncodedData = useCallback((data: string) => {
    setState(prev => ({
      ...prev,
      encodedData: data,
      error: null,
      functionInfo: null,
      decodedResult: null,
    }));
  }, []);

  // Fetch mode actions
  const setTxHash = useCallback((hash: string) => {
    setState(prev => ({
      ...prev,
      txHash: hash,
      error: null,
      functionInfo: null,
      decodedResult: null,
      transactionDetails: null,
      contractInfo: null,
    }));
  }, []);

  // Contract mode actions
  const setContractAddress = useCallback((address: string) => {
    setState(prev => ({
      ...prev,
      contractAddress: address,
      error: null,
      functionInfo: null,
      decodedResult: null,
      contractInfo: null,
      cacheUsed: false,
    }));
  }, []);

  const setPayloadData = useCallback((data: string) => {
    setState(prev => ({
      ...prev,
      payloadData: data,
      error: null,
      functionInfo: null,
      decodedResult: null,
    }));
  }, []);

  const fetchTransactionData = useCallback(async () => {
    if (!state.txHash) {
      toast.error('Transaction hash is required');
      setState(prev => ({ ...prev, error: 'Transaction hash is required' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch transaction details
      const transaction = await transactionFetcher.fetchTransaction(
        state.txHash as Hash,
        state.selectedNetwork
      );

      if (!transaction.to) {
        toast.error('Cannot decode contract creation transaction');
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'This is a contract creation transaction - no contract address to fetch ABI from',
        }));
        return;
      }

      // Fetch contract ABI
      const fetchResult = await abiFetcher.fetchContractAbi(transaction.to, state.selectedNetwork);

      // Update state with fetched data and also populate manual mode fields for decoding
      setState(prev => ({
        ...prev,
        isLoading: false,
        transactionDetails: transaction,
        contractInfo: fetchResult.contractInfo,
        abiJson: fetchResult.contractInfo.abi,
        encodedData: transaction.input,
        cacheUsed: fetchResult.cacheUsed,
        error: null,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch transaction data';
      toast.error(errorMessage);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [state.txHash, state.selectedNetwork]);

  const decode = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // If in fetch mode and we don't have transaction data yet, fetch it first
      if (state.mode === 'fetch' && (!state.transactionDetails || !state.contractInfo)) {
        if (!state.txHash) {
          toast.error('Transaction hash is required');
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Transaction hash is required',
          }));
          return;
        }

        // Fetch transaction details
        const transaction = await transactionFetcher.fetchTransaction(
          state.txHash as Hash,
          state.selectedNetwork
        );

        if (!transaction.to) {
          toast.error('Cannot decode contract creation transaction');
          setState(prev => ({
            ...prev,
            isLoading: false,
            error:
              'This is a contract creation transaction - no contract address to fetch ABI from',
          }));
          return;
        }

        // Fetch contract ABI (this will check cache first)
        const fetchResult = await abiFetcher.fetchContractAbi(
          transaction.to,
          state.selectedNetwork
        );

        // Update state with fetched data
        setState(prev => ({
          ...prev,
          transactionDetails: transaction,
          contractInfo: fetchResult.contractInfo,
          abiJson: fetchResult.contractInfo.abi,
          encodedData: transaction.input,
          cacheUsed: fetchResult.cacheUsed,
        }));

        // Now decode with the fetched data
        await decodeWithData(fetchResult.contractInfo.abi, transaction.input);
        return;
      }

      // If in contract mode and we don't have ABI yet, fetch it first
      if (state.mode === 'contract' && !state.contractInfo) {
        if (!state.contractAddress) {
          toast.error('Contract address is required');
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Contract address is required',
          }));
          return;
        }

        if (!state.payloadData) {
          toast.error('Payload data is required');
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Payload data is required',
          }));
          return;
        }

        // Fetch contract ABI using the contract address
        const fetchResult = await abiFetcher.fetchContractAbi(
          state.contractAddress as `0x${string}`,
          state.selectedNetwork
        );

        // Update state with fetched data
        setState(prev => ({
          ...prev,
          contractInfo: fetchResult.contractInfo,
          abiJson: fetchResult.contractInfo.abi,
          encodedData: state.payloadData,
          cacheUsed: fetchResult.cacheUsed,
        }));

        // Now decode with the fetched data
        await decodeWithData(fetchResult.contractInfo.abi, state.payloadData);
        return;
      }

      // Decode with current data (manual mode or already fetched data)
      await decodeWithData(state.abiJson, state.encodedData);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch transaction data and decode';
      toast.error(errorMessage);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [
    state.mode,
    state.txHash,
    state.contractAddress,
    state.payloadData,
    state.selectedNetwork,
    state.transactionDetails,
    state.contractInfo,
    state.abiJson,
    state.encodedData,
  ]);

  const decodeWithData = useCallback(async (abiJson: string, encodedData: string) => {
    try {
      // Parse ABI
      const abiParseResult = parseAbi(abiJson);
      if (!abiParseResult.success || !abiParseResult.abi) {
        const errorMessage = abiParseResult.error || 'Failed to parse ABI';
        toast.error(errorMessage);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return;
      }

      // Decode data
      const decodeResult = decodeData(abiParseResult.abi, encodedData);
      if (!decodeResult.success || !decodeResult.data) {
        const errorMessage = decodeResult.error || 'Failed to decode data';
        toast.error(errorMessage);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return;
      }

      // Format result - use the function from decode result to get correct parameters
      const func = findFunction(abiParseResult.abi, decodeResult.functionInfo?.selector?.slice(2));
      const parameters = func?.inputs || [];
      const formattedResult = formatDecodedResult(parameters, decodeResult.data);

      // Show success toast
      toast.success('Transaction data decoded successfully!', {
        description: decodeResult.functionInfo
          ? `Function: ${decodeResult.functionInfo.name}`
          : `${formattedResult.length} parameters decoded`,
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        parsedAbi: abiParseResult.abi || null,
        functionInfo: decodeResult.functionInfo || null,
        decodedResult: formattedResult,
        error: null,
      }));
    } catch (error) {
      const errorMessage = `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      toast.error(errorMessage);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    // Mode and network actions
    setMode,
    setSelectedNetwork,
    // Manual mode actions
    setAbiJson,
    setEncodedData,
    // Fetch mode actions
    setTxHash,
    fetchTransactionData,
    // Contract mode actions
    setContractAddress,
    setPayloadData,
    // Common actions
    decode,
    reset,
  };
}
