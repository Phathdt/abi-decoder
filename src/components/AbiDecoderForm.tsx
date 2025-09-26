import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NetworkSelector } from '@/components/NetworkSelector';
import { Copy, Loader2, RotateCcw, Check, Hash, FileText, Zap, Code } from 'lucide-react';
import { toast } from 'sonner';

import { useAbiDecoderForm, type DecoderMode } from '@/hooks/useAbiDecoderForm';
import {
  abiDecoderFormSchema,
  manualModeSchema,
  fetchModeSchema,
  contractModeSchema,
  type AbiDecoderFormData,
  type FetchModeFormData,
  type ContractModeFormData,
} from '@/lib/validation';
import { defaultNetwork } from '@/lib/networks';

export function AbiDecoderForm() {
  const [mode, setMode] = useState<DecoderMode>('contract');
  const [copied, setCopied] = useState<string | null>(null);

  const {
    transactionDetails,
    contractInfo,
    functionInfo,
    decodedResult,
    isLoading,
    error: hookError,
    cacheUsed,
    fetchTransactionData,
    fetchContractAbi,
    decodeData,
    reset,
  } = useAbiDecoderForm();

  // Form setup with unified schema
  const form = useForm<AbiDecoderFormData>({
    resolver: zodResolver(abiDecoderFormSchema),
    mode: 'onChange',
    defaultValues: {
      selectedNetwork: defaultNetwork,
      abiJson: '',
      encodedData: '',
      txHash: '',
      contractAddress: '',
      payloadData: '',
    },
  });

  const { register, handleSubmit, formState: { errors }, reset: resetForm, watch, setValue } = form;

  // Reset form when mode changes
  useEffect(() => {
    resetForm({
      selectedNetwork: defaultNetwork,
      abiJson: '',
      encodedData: '',
      txHash: '',
      contractAddress: '',
      payloadData: '',
    });
    reset();
  }, [mode, resetForm, reset]);

  const selectedNetwork = watch('selectedNetwork');

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast.error('Failed to copy text');
    }
  };

  const onSubmit = async (data: AbiDecoderFormData) => {
    // Validate based on current mode
    try {
      if (mode === 'manual') {
        manualModeSchema.parse(data);
      } else if (mode === 'fetch') {
        fetchModeSchema.parse(data);
      } else {
        contractModeSchema.parse(data);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error('Please fix the validation errors');
      }
      return;
    }

    const formData = { ...data, mode };

    if (mode === 'fetch') {
      const fetchResult = await fetchTransactionData(data as FetchModeFormData);
      if (fetchResult.error) return;

      // Auto-populate ABI and data for decoding
      if (fetchResult.contractInfo && fetchResult.transaction) {
        setValue('abiJson', fetchResult.contractInfo.abi);
        setValue('encodedData', fetchResult.transaction.input);
        // Auto-decode after fetching
        setTimeout(() => decodeData(formData, mode), 100);
      }
    } else if (mode === 'contract') {
      const fetchResult = await fetchContractAbi(data as ContractModeFormData);
      if (fetchResult.error) return;

      // Auto-populate ABI for decoding
      if (fetchResult.contractInfo) {
        setValue('abiJson', fetchResult.contractInfo.abi);
        // Auto-decode after fetching ABI
        setTimeout(() => decodeData(formData, mode), 100);
      }
    } else {
      // Manual mode - decode directly
      decodeData(formData, mode);
    }
  };

  const typeColorMap = {
    address: {
      type: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
      value: 'text-blue-700 dark:text-blue-300',
    },
    bool: {
      type: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950',
      value: 'text-green-700 dark:text-green-300',
    },
    number: {
      type: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950',
      value: 'text-purple-700 dark:text-purple-300',
    },
    bytes: {
      type: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950',
      value: 'text-orange-700 dark:text-orange-300',
    },
    tuple: {
      type: 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-950',
      value: 'text-pink-700 dark:text-pink-300',
    },
    default: {
      type: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950',
      value: 'text-gray-700 dark:text-gray-300',
    },
  };

  const getTypeCategory = (type: string): keyof typeof typeColorMap => {
    const baseType = type.replace(/\[\d*\]/g, '').toLowerCase();
    if (baseType === 'address') return 'address';
    if (baseType === 'bool') return 'bool';
    if (baseType.startsWith('uint') || baseType.startsWith('int')) return 'number';
    if (baseType.startsWith('bytes') || baseType === 'string') return 'bytes';
    if (baseType === 'tuple') return 'tuple';
    return 'default';
  };

  const getTypeColor = (type: string): string => {
    return typeColorMap[getTypeCategory(type)].type;
  };

  const getValueColor = (type: string): string => {
    return typeColorMap[getTypeCategory(type)].value;
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">ABI Decoder</h1>
          <p className="text-muted-foreground">
            Decode Ethereum smart contract function calls and transaction data
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Network Selection</CardTitle>
            <CardDescription>Choose the blockchain network for your contract</CardDescription>
          </CardHeader>
          <CardContent>
            <NetworkSelector
              value={selectedNetwork}
              onValueChange={(network) => setValue('selectedNetwork', network)}
            />
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={mode} onValueChange={(value) => setMode(value as DecoderMode)}>
            <Card>
              <CardHeader>
                <CardTitle>Decode Method</CardTitle>
                <CardDescription>
                  Choose to manually enter data, fetch from transaction hash, or decode by contract address
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="contract" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Contract
                  </TabsTrigger>
                  <TabsTrigger value="fetch" className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Transaction
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Manual
                  </TabsTrigger>
                </TabsList>

                {/* Contract Mode */}
                <TabsContent value="contract" className="mt-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="contract-address" className="text-sm font-medium mb-2 block">
                        Contract Address
                      </label>
                      <Input
                        id="contract-address"
                        placeholder="0x742d35cc6634C0532925a3b8D91B94E8A72c3b31"
                        className="font-mono text-sm"
                        {...register('contractAddress')}
                      />
                      {errors.contractAddress && (
                        <p className="text-sm text-red-600 mt-1">{errors.contractAddress.message?.toString()}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="payload-data" className="text-sm font-medium mb-2 block">
                        Payload Data
                      </label>
                      <Input
                        id="payload-data"
                        placeholder="0xa9059cbb000000000000000000000000742d35cc..."
                        className="font-mono text-sm"
                        {...register('payloadData')}
                      />
                      {errors.payloadData && (
                        <p className="text-sm text-red-600 mt-1">{errors.payloadData.message?.toString()}</p>
                      )}
                    </div>

                    {contractInfo && (
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-sm">Contract Info</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {contractInfo.contractName}
                              {contractInfo.isProxy && (
                                <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                  Proxy
                                </span>
                              )}
                              {cacheUsed && (
                                <span className="ml-2 inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                                  Cached
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button type="submit" disabled={isLoading} className="flex-1">
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          'Decode'
                        )}
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => { resetForm(); reset(); }}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Fetch Mode */}
                <TabsContent value="fetch" className="mt-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="txhash" className="text-sm font-medium mb-2 block">
                        Transaction Hash
                      </label>
                      <Input
                        id="txhash"
                        placeholder="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
                        className="font-mono text-sm"
                        {...register('txHash')}
                      />
                      {errors.txHash && (
                        <p className="text-sm text-red-600 mt-1">{errors.txHash.message?.toString()}</p>
                      )}
                    </div>

                    {transactionDetails && (
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <h3 className="font-medium text-sm">Transaction Details</h3>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">To:</span>{' '}
                            <span className="font-mono">{transactionDetails.to}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Value:</span>{' '}
                            <span className="font-mono">{transactionDetails.value.toString()}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">Gas:</span>{' '}
                            <span className="font-mono">{transactionDetails.gas.toString()}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button type="submit" disabled={isLoading} className="flex-1">
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Fetching...
                          </>
                        ) : (
                          'Fetch & Decode'
                        )}
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => { resetForm(); reset(); }}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Manual Mode */}
                <TabsContent value="manual" className="mt-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="abi-json" className="text-sm font-medium mb-2 block">
                        ABI JSON
                      </label>
                      <Textarea
                        id="abi-json"
                        placeholder='[{"inputs":[{"name":"recipient","type":"address"},{"name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"}]'
                        className="font-mono text-sm min-h-32"
                        {...register('abiJson')}
                      />
                      {errors.abiJson && (
                        <p className="text-sm text-red-600 mt-1">{errors.abiJson.message?.toString()}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="encoded-data" className="text-sm font-medium mb-2 block">
                        Encoded Data
                      </label>
                      <Textarea
                        id="encoded-data"
                        placeholder="0xa9059cbb000000000000000000000000742d35cc6634c0532925a3b8d91b94e8a72c3b310000000000000000000000000000000000000000000000000de0b6b3a7640000"
                        className="font-mono text-sm min-h-20"
                        {...register('encodedData')}
                      />
                      {errors.encodedData && (
                        <p className="text-sm text-red-600 mt-1">{errors.encodedData.message?.toString()}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" disabled={isLoading} className="flex-1">
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Decoding...
                          </>
                        ) : (
                          'Decode'
                        )}
                      </Button>
                      <Button type="button" variant="outline" size="icon" onClick={() => { resetForm(); reset(); }}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </form>

        {/* Error Display */}
        {(hookError || Object.keys(errors).length > 0) && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-2">
                <div className="text-red-600 dark:text-red-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Validation Error
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {hookError || 'Please correct the form errors above.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {functionInfo && decodedResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Decoded Results</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(functionInfo.signature, 'signature')}
                    >
                      {copied === 'signature' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy function signature</TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Function: <code className="font-mono">{functionInfo.name}</code> (
                <code className="font-mono text-xs">{functionInfo.selector}</code>)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">Function Signature</h3>
                  <div className="p-3 bg-muted rounded-lg">
                    <code className="text-sm font-mono">{functionInfo.signature}</code>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3">Parameters</h3>
                  <div className="space-y-3">
                    {decodedResult.map((param, index) => (
                      <div
                        key={`${param.parameterIndex}-${index}`}
                        className="p-4 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-mono ${getTypeColor(param.type)}`}
                            >
                              {param.type}
                            </span>
                            <span className="font-medium text-sm">{param.name}</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCopy(param.displayValue, `param-${index}`)}
                              >
                                {copied === `param-${index}` ? (
                                  <Check className="h-4 w-4 text-green-600" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy parameter value</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="break-all">
                          <span className={`font-mono text-sm ${getValueColor(param.type)}`}>
                            {param.displayValue}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}