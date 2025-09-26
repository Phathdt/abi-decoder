import { useState, useCallback } from 'react';
import { type Abi, type Hash } from 'viem';
import { parseAbi, decodeData as decodeAbiData, formatDecodedResult, findFunction } from '../lib/abi-decoder';
import { transactionFetcher, type TransactionDetails } from '../lib/transaction-fetcher';
import { abiFetcher, type ContractInfo } from '../lib/abi-fetcher';
import { toast } from 'sonner';
import type {
  AbiDecoderFormData,
  FetchModeFormData,
  ContractModeFormData
} from '../lib/validation';

export type DecoderMode = 'manual' | 'fetch' | 'contract';

export interface DecoderState {
  // Fetched data (populated when using fetch/contract modes)
  transactionDetails: TransactionDetails | null;
  contractInfo: ContractInfo | null;

  // Common decode results
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

  // Loading and error states
  isLoading: boolean;
  error: string | null;
  cacheUsed: boolean;
}

const initialState: DecoderState = {
  transactionDetails: null,
  contractInfo: null,
  parsedAbi: null,
  functionInfo: null,
  decodedResult: null,
  isLoading: false,
  error: null,
  cacheUsed: false,
};

export function useAbiDecoderForm() {
  const [state, setState] = useState<DecoderState>(initialState);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  const fetchTransactionData = useCallback(async (formData: FetchModeFormData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch transaction details
      const transaction = await transactionFetcher.fetchTransaction(
        formData.txHash as Hash,
        formData.selectedNetwork
      );

      if (!transaction.to) {
        const error = 'This is a contract creation transaction - no contract address to fetch ABI from';
        toast.error('Cannot decode contract creation transaction');
        setState(prev => ({
          ...prev,
          isLoading: false,
          error,
        }));
        return { transaction, contractInfo: null, error };
      }

      // Fetch contract ABI
      const fetchResult = await abiFetcher.fetchContractAbi(transaction.to, formData.selectedNetwork);

      setState(prev => ({
        ...prev,
        isLoading: false,
        transactionDetails: transaction,
        contractInfo: fetchResult.contractInfo,
        cacheUsed: fetchResult.cacheUsed,
        error: null,
      }));

      return { transaction, contractInfo: fetchResult.contractInfo, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch transaction data';
      toast.error(errorMessage);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { transaction: null, contractInfo: null, error: errorMessage };
    }
  }, []);

  const fetchContractAbi = useCallback(async (formData: ContractModeFormData) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const fetchResult = await abiFetcher.fetchContractAbi(
        formData.contractAddress as `0x${string}`,
        formData.selectedNetwork
      );

      setState(prev => ({
        ...prev,
        isLoading: false,
        contractInfo: fetchResult.contractInfo,
        cacheUsed: fetchResult.cacheUsed,
        error: null,
      }));

      return { contractInfo: fetchResult.contractInfo, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch contract ABI';
      toast.error(errorMessage);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { contractInfo: null, error: errorMessage };
    }
  }, []);

  const decodeData = useCallback((formData: AbiDecoderFormData, mode: DecoderMode) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let abiToUse: string;
      let dataToDecodeHex: string;

      if (mode === 'manual') {
        abiToUse = formData.abiJson!;
        dataToDecodeHex = formData.encodedData!;
      } else if (mode === 'fetch') {
        if (!state.contractInfo) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Transaction data not fetched yet'
          }));
          return;
        }
        abiToUse = state.contractInfo.abi;
        dataToDecodeHex = state.transactionDetails?.input || '';
      } else { // contract mode
        if (!state.contractInfo) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Contract ABI not fetched yet'
          }));
          return;
        }
        abiToUse = state.contractInfo.abi;
        dataToDecodeHex = formData.payloadData!;
      }

      // Parse ABI
      const parseResult = parseAbi(abiToUse);
      if (!parseResult.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: parseResult.error || null,
        }));
        return;
      }

      // Decode the data
      const decodeResult = decodeAbiData(parseResult.abi!, dataToDecodeHex);
      if (!decodeResult.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: decodeResult.error || null,
        }));
        return;
      }

      // Format the results
      const func = findFunction(parseResult.abi!,
        decodeResult.functionInfo?.selector?.slice(2)
      );

      let formattedResult = null;
      if (func && decodeResult.data) {
        formattedResult = formatDecodedResult(func.inputs || [], decodeResult.data);
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        parsedAbi: parseResult.abi!,
        functionInfo: decodeResult.functionInfo || null,
        decodedResult: formattedResult,
        error: null,
      }));

      toast.success('Data decoded successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Decoding failed';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
    }
  }, [state.contractInfo, state.transactionDetails]);

  return {
    ...state,
    fetchTransactionData,
    fetchContractAbi,
    decodeData,
    reset,
  };
}