import { z } from 'zod';

// Transaction hash validation (66 characters: 0x + 64 hex chars)
export const transactionHashSchema = z
  .string()
  .min(1, 'Transaction hash is required')
  .length(66, 'Transaction hash must be exactly 66 characters (0x + 64 hex chars)')
  .startsWith('0x', 'Transaction hash must start with 0x')
  .regex(/^0x[0-9a-fA-F]{64}$/, 'Transaction hash must contain only hexadecimal characters');

// Contract address validation (42 characters: 0x + 40 hex chars)
export const contractAddressSchema = z
  .string()
  .min(1, 'Contract address is required')
  .length(42, 'Contract address must be exactly 42 characters (0x + 40 hex chars)')
  .startsWith('0x', 'Contract address must start with 0x')
  .regex(/^0x[0-9a-fA-F]{40}$/, 'Contract address must contain only hexadecimal characters');

// Payload data validation (even length hex string)
export const payloadDataSchema = z
  .string()
  .min(1, 'Payload data is required')
  .refine(data => {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    return cleanData.length % 2 === 0;
  }, 'Payload data must have even length (each byte requires 2 hex characters)')
  .refine(data => {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    return /^[0-9a-fA-F]*$/.test(cleanData);
  }, 'Payload data must contain only hexadecimal characters');

// ABI JSON validation
export const abiJsonSchema = z
  .string()
  .min(1, 'ABI JSON is required')
  .refine(value => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }, 'ABI must be a valid JSON array with at least one item');

// Encoded data validation for manual mode
export const encodedDataSchema = z
  .string()
  .min(1, 'Encoded data is required')
  .refine(data => {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    return cleanData.length % 2 === 0;
  }, 'Encoded data must have even length (each byte requires 2 hex characters)')
  .refine(data => {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    return /^[0-9a-fA-F]*$/.test(cleanData);
  }, 'Encoded data must contain only hexadecimal characters');

// Unified form schema with optional fields
export const abiDecoderFormSchema = z.object({
  selectedNetwork: z.string().min(1, 'Network selection is required'),
  // All fields are optional, validation happens on submit based on mode
  abiJson: z.string().optional(),
  encodedData: z.string().optional(),
  txHash: z.string().optional(),
  contractAddress: z.string().optional(),
  payloadData: z.string().optional(),
});

// Form schemas for each mode (for submit validation)
export const manualModeSchema = z.object({
  selectedNetwork: z.string().min(1, 'Network selection is required'),
  abiJson: abiJsonSchema,
  encodedData: encodedDataSchema,
});

export const fetchModeSchema = z.object({
  selectedNetwork: z.string().min(1, 'Network selection is required'),
  txHash: transactionHashSchema,
});

export const contractModeSchema = z.object({
  selectedNetwork: z.string().min(1, 'Network selection is required'),
  contractAddress: contractAddressSchema,
  payloadData: payloadDataSchema,
});

export type AbiDecoderFormData = z.infer<typeof abiDecoderFormSchema>;
export type ManualModeFormData = z.infer<typeof manualModeSchema>;
export type FetchModeFormData = z.infer<typeof fetchModeSchema>;
export type ContractModeFormData = z.infer<typeof contractModeSchema>;
