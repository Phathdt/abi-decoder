import { useState, useCallback } from 'react';
import { type Abi } from 'viem';
import {
  parseAbi,
  decodeData,
  formatDecodedResult,
  findFunction
} from '../lib/abi-decoder';

export interface AbiDecoderState {
  abiJson: string;
  encodedData: string;
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
}

export interface AbiDecoderActions {
  setAbiJson: (json: string) => void;
  setEncodedData: (data: string) => void;
  decode: () => void;
  reset: () => void;
}

const initialState: AbiDecoderState = {
  abiJson: '',
  encodedData: '',
  parsedAbi: null,
  functionInfo: null,
  decodedResult: null,
  isLoading: false,
  error: null,
};

export function useAbiDecoder(): AbiDecoderState & AbiDecoderActions {
  const [state, setState] = useState<AbiDecoderState>(initialState);

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

  const decode = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Parse ABI
      const abiParseResult = parseAbi(state.abiJson);
      if (!abiParseResult.success || !abiParseResult.abi) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: abiParseResult.error || 'Failed to parse ABI',
        }));
        return;
      }

      // Decode data
      const decodeResult = decodeData(abiParseResult.abi, state.encodedData);
      if (!decodeResult.success || !decodeResult.data) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: decodeResult.error || 'Failed to decode data',
        }));
        return;
      }

      // Format result - use the function from decode result to get correct parameters
      const func = findFunction(abiParseResult.abi, decodeResult.functionInfo?.selector?.slice(2));
      const parameters = func?.inputs || [];
      const formattedResult = formatDecodedResult(parameters, decodeResult.data);

      setState(prev => ({
        ...prev,
        isLoading: false,
        parsedAbi: abiParseResult.abi || null,
        functionInfo: decodeResult.functionInfo || null,
        decodedResult: formattedResult,
        error: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  }, [state.abiJson, state.encodedData]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    setAbiJson,
    setEncodedData,
    decode,
    reset,
  };
}