import {
  decodeAbiParameters,
  type Abi,
  type AbiParameter,
  type AbiFunction,
  keccak256,
  toHex,
} from 'viem';

export interface DecodeResult {
  success: boolean;
  data?: unknown[];
  functionInfo?: {
    name: string;
    signature: string;
    selector: string;
  };
  error?: string;
}

export interface ParsedAbi {
  success: boolean;
  abi?: Abi;
  error?: string;
}

/**
 * Parse and validate ABI JSON string
 */
export function parseAbi(abiJson: string): ParsedAbi {
  try {
    if (!abiJson.trim()) {
      return { success: false, error: 'ABI JSON cannot be empty' };
    }

    const parsed = JSON.parse(abiJson);

    if (!Array.isArray(parsed)) {
      return { success: false, error: 'ABI must be an array' };
    }

    // Basic validation - check if it looks like an ABI
    if (parsed.length === 0) {
      return { success: false, error: 'ABI array cannot be empty' };
    }

    // Validate that items have expected ABI structure
    const validAbiTypes = ['function', 'event', 'constructor', 'error', 'fallback', 'receive'];
    const hasValidItems = parsed.some(
      item =>
        typeof item === 'object' &&
        item !== null &&
        (!item.type || validAbiTypes.includes(item.type))
    );

    if (!hasValidItems) {
      return { success: false, error: 'Invalid ABI format' };
    }

    return { success: true, abi: parsed as Abi };
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Generate function signature from ABI function
 */
function generateFunctionSignature(func: AbiFunction): string {
  const formatType = (param: AbiParameter): string => {
    // Handle tuple and tuple[] types
    if (param.type.startsWith('tuple') && 'components' in param && param.components) {
      const componentTypes = param.components.map(formatType).join(',');
      // Check if it's a tuple array (e.g., tuple[], tuple[3])
      const arraySuffix = param.type.slice(5); // Get everything after 'tuple'
      return `(${componentTypes})${arraySuffix}`;
    }
    return param.type;
  };

  const inputTypes = func.inputs?.map(formatType).join(',') || '';
  return `${func.name}(${inputTypes})`;
}

/**
 * Calculate function selector from function signature
 */
function calculateFunctionSelector(func: AbiFunction): string {
  const signature = generateFunctionSignature(func);
  const hash = keccak256(toHex(signature));
  return hash.slice(0, 10); // First 4 bytes (8 hex chars + 0x)
}

/**
 * Find function by selector or return first function with inputs
 */
export function findFunction(abi: Abi, functionSelector?: string): AbiFunction | null {
  // Look for functions with inputs
  const functionsWithInputs = abi.filter(
    (item): item is AbiFunction =>
      item.type === 'function' && item.inputs !== undefined && item.inputs.length > 0
  );

  if (functionsWithInputs.length === 0) {
    return null;
  }

  // If we have a function selector, try to find the matching function
  if (functionSelector) {
    const targetSelector = `0x${functionSelector}`;

    for (const func of functionsWithInputs) {
      try {
        const calculatedSelector = calculateFunctionSelector(func);
        if (calculatedSelector.toLowerCase() === targetSelector.toLowerCase()) {
          return func;
        }
      } catch (error) {
        // If we can't calculate the selector for this function, skip it
        continue;
      }
    }

    // If we have a function selector but no matching function found, throw error
    const availableFunctions = functionsWithInputs
      .map(f => {
        try {
          const selector = calculateFunctionSelector(f);
          return `${f.name}: ${selector}`;
        } catch {
          return `${f.name}: [error calculating selector]`;
        }
      })
      .join(', ');

    throw new Error(
      `No function found matching selector ${targetSelector}. ` +
        `Available functions: ${availableFunctions}`
    );
  }

  // Only use fallback when no selector is provided
  return functionsWithInputs[0];
}

/**
 * Extract parameters from ABI for decoding
 */
export function extractAbiParameters(abi: Abi, functionSelector?: string): readonly AbiParameter[] {
  const func = findFunction(abi, functionSelector);

  if (func && func.inputs) {
    return func.inputs;
  }

  // Fallback: look for event inputs
  for (const item of abi) {
    if (item.type === 'event' && item.inputs && item.inputs.length > 0) {
      return item.inputs;
    }
  }

  throw new Error('No function or event with inputs found in ABI');
}

/**
 * 11Decode data using ABI parameters
 */
export function decodeData(abi: Abi, encodedData: string): DecodeResult {
  try {
    if (!encodedData.trim()) {
      return { success: false, error: 'Encoded data cannot be empty' };
    }

    // Remove 0x prefix if present
    const cleanData = encodedData.startsWith('0x') ? encodedData.slice(2) : encodedData;

    // Validate hex string
    if (!/^[0-9a-fA-F]*$/.test(cleanData)) {
      return { success: false, error: 'Data must be a valid hexadecimal string' };
    }

    if (cleanData.length % 2 !== 0) {
      return { success: false, error: 'Hex data must have even length' };
    }

    // Check if this looks like function call data (has function selector)
    let dataToDecodeHex: string;
    let functionSelector: string | undefined;

    if (cleanData.length >= 8) {
      // Extract function selector (first 4 bytes = 8 hex chars)
      functionSelector = cleanData.slice(0, 8);
      dataToDecodeHex = cleanData.slice(8);
    } else {
      // Data is too short to have function selector, use as-is
      dataToDecodeHex = cleanData;
    }

    // If no data left after removing selector, return empty result
    if (dataToDecodeHex.length === 0) {
      return { success: true, data: [] };
    }

    // Find the function and extract parameters
    const func = findFunction(abi, functionSelector);
    const parameters = extractAbiParameters(abi, functionSelector);

    // Decode the data (without function selector)
    const decoded = decodeAbiParameters(parameters, `0x${dataToDecodeHex}`);

    // Prepare function info
    let functionInfo;
    if (func) {
      const signature = generateFunctionSignature(func);
      functionInfo = {
        name: func.name || 'unknown',
        signature,
        selector: functionSelector ? `0x${functionSelector}` : 'unknown',
      };
    }

    return {
      success: true,
      data: Array.from(decoded),
      functionInfo,
    };
  } catch (error) {
    return {
      success: false,
      error: `Decoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Format decoded result for display with flattened tuple structure
 */
export function formatDecodedResult(
  parameters: readonly AbiParameter[],
  values: unknown[]
): Array<{
  name: string;
  type: string;
  value: unknown;
  displayValue: string;
  parameterIndex: number;
}> {
  const result: Array<{
    name: string;
    type: string;
    value: unknown;
    displayValue: string;
    parameterIndex: number;
  }> = [];

  const formatValue = (value: unknown, type?: string): string => {
    if (typeof value === 'bigint') {
      return value.toString();
    } else if (typeof value === 'boolean') {
      return value.toString();
    } else if (Array.isArray(value)) {
      // Special handling for bytes arrays
      if (type && type.startsWith('bytes[')) {
        return value
          .map(v => {
            const str = String(v);
            // Convert hex to UTF-8 if it looks like text
            if (str.startsWith('0x')) {
              try {
                const hex = str.slice(2);
                // Simple hex to text conversion
                let decoded = '';
                for (let i = 0; i < hex.length; i += 2) {
                  const charCode = parseInt(hex.substr(i, 2), 16);
                  if (charCode > 31 && charCode < 127) {
                    decoded += String.fromCharCode(charCode);
                  } else {
                    return str; // Return hex if not printable ASCII
                  }
                }
                return decoded || str;
              } catch {
                return str;
              }
            }
            return str;
          })
          .join(',');
      }
      return value.map(v => (typeof v === 'bigint' ? v.toString() : String(v))).join(',');
    } else {
      return String(value);
    }
  };

  const flattenTuple = (
    param: AbiParameter,
    value: unknown,
    prefix: string = '',
    paramIndex: number = 0
  ) => {
    const paramName = param.name || 'param';
    const fullName = prefix ? `${prefix}.${paramName}` : paramName;

    if (param.type === 'tuple' && 'components' in param && param.components) {
      // Handle tuple - flatten its components
      if (typeof value === 'object' && value !== null) {
        param.components.forEach(component => {
          const componentName = component.name || 'component';
          const componentValue = (value as any)[componentName];
          flattenTuple(component, componentValue, fullName, paramIndex);
        });
      } else if (Array.isArray(value)) {
        // Fallback for array-based tuples
        param.components.forEach((component, componentIndex) => {
          flattenTuple(component, value[componentIndex], fullName, paramIndex);
        });
      }
    } else {
      // Handle primitive type
      result.push({
        name: fullName,
        type: param.type,
        value,
        displayValue: formatValue(value, param.type),
        parameterIndex: paramIndex,
      });
    }
  };

  parameters.forEach((param, index) => {
    flattenTuple(param, values[index], '', index);
  });

  return result;
}
