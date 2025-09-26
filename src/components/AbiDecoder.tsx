import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAbiDecoder, type DecoderMode } from '@/hooks/useAbiDecoder';
import { NetworkSelector } from '@/components/NetworkSelector';
import { Copy, Loader2, RotateCcw, Check, Hash, FileText, Zap, Code } from 'lucide-react';

export function AbiDecoder() {
  const {
    // Mode and network
    mode,
    selectedNetwork,
    setMode,
    setSelectedNetwork,

    // Manual mode
    abiJson,
    encodedData,
    setAbiJson,
    setEncodedData,

    // Fetch mode
    txHash,
    transactionDetails,
    contractInfo,
    setTxHash,

    // Contract mode
    contractAddress,
    payloadData,
    setContractAddress,
    setPayloadData,

    // Common
    functionInfo,
    decodedResult,
    isLoading,
    error,
    cacheUsed,
    decode,
    reset,
  } = useAbiDecoder();

  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // You could set an error state here if needed
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
    const category = getTypeCategory(type);
    return typeColorMap[category].type;
  };

  const getValueColor = (type: string): string => {
    const category = getTypeCategory(type);
    return typeColorMap[category].value;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight">ABI Decoder</h1>
              <p className="text-muted-foreground mt-2">
                Decode Ethereum smart contract data using ABI definitions
              </p>
            </div>

            {/* Mode Selection and Input */}
            <Card>
              <CardHeader>
                <CardTitle>Decode Method</CardTitle>
                <CardDescription>
                  Choose to manually enter data, fetch from transaction hash, or decode by contract address
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={mode} onValueChange={value => setMode(value as DecoderMode)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="contract" className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Contract + Payload
                    </TabsTrigger>
                    <TabsTrigger value="fetch" className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Fetch from TxHash
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Manual Input
                    </TabsTrigger>
                  </TabsList>

                  {/* Contract Mode */}
                  <TabsContent value="contract" className="mt-6">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="network-contract" className="text-sm font-medium mb-2 block">
                          Network
                        </label>
                        <NetworkSelector
                          value={selectedNetwork}
                          onValueChange={setSelectedNetwork}
                          disabled={isLoading}
                        />
                      </div>

                      <div>
                        <label htmlFor="contract-address" className="text-sm font-medium mb-2 block">
                          Contract Address
                        </label>
                        <Input
                          id="contract-address"
                          placeholder="0x742d35cc6634C0532925a3b8D91B94E8A72c3b31"
                          value={contractAddress}
                          onChange={e => setContractAddress(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="payload-data" className="text-sm font-medium mb-2 block">
                          Payload Data
                        </label>
                        <Input
                          id="payload-data"
                          placeholder="0xa9059cbb000000000000000000000000742d35cc..."
                          value={payloadData}
                          onChange={e => setPayloadData(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>

                      {/* Contract Info Display */}
                      {contractInfo && (
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            Contract Info:
                            {cacheUsed && (
                              <div className="flex items-center gap-1 text-green-600 text-xs">
                                <Zap className="h-3 w-3" />
                                <span>ABI Cached</span>
                              </div>
                            )}
                          </h4>
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="text-muted-foreground">Name:</span>{' '}
                              {contractInfo.contractName}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Address:</span>{' '}
                              <code className="text-xs">{contractInfo.contractAddress}</code>
                            </div>
                            {contractInfo.isProxy && contractInfo.implementationAddress && (
                              <div>
                                <span className="text-muted-foreground">Implementation:</span>{' '}
                                <code className="text-xs">
                                  {contractInfo.implementationAddress}
                                </code>
                              </div>
                            )}
                            {contractInfo.isProxy && (
                              <div>
                                <span className="text-muted-foreground">Proxy Type:</span>{' '}
                                <span className="text-blue-600">
                                  {contractInfo.proxyType?.toUpperCase() || 'UNKNOWN'}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">Verified:</span>{' '}
                              <span
                                className={
                                  contractInfo.isVerified ? 'text-green-600' : 'text-red-600'
                                }
                              >
                                {contractInfo.isVerified ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={decode}
                          disabled={!contractAddress || !payloadData || isLoading}
                          className="flex-1"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Fetching ABI & Decoding...
                            </>
                          ) : (
                            'Decode'
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={reset}
                          title="Reset all fields"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Fetch Mode */}
                  <TabsContent value="fetch" className="mt-6">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="network" className="text-sm font-medium mb-2 block">
                          Network
                        </label>
                        <NetworkSelector
                          value={selectedNetwork}
                          onValueChange={setSelectedNetwork}
                          disabled={isLoading}
                        />
                      </div>

                      <div>
                        <label htmlFor="txhash" className="text-sm font-medium mb-2 block">
                          Transaction Hash
                        </label>
                        <Input
                          id="txhash"
                          placeholder="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
                          value={txHash}
                          onChange={e => setTxHash(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>

                      {/* Transaction Info Display */}
                      {transactionDetails && (
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                          <h4 className="font-medium text-sm">Transaction Details:</h4>
                          <div className="text-xs space-y-1 font-mono">
                            <div>
                              <span className="text-muted-foreground">To:</span>{' '}
                              {transactionDetails.to}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Block:</span>{' '}
                              {transactionDetails.blockNumber.toString()}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Gas:</span>{' '}
                              {transactionDetails.gas.toString()}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Contract Info Display */}
                      {contractInfo && (
                        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                          <h4 className="font-medium text-sm flex items-center gap-2">
                            Contract Info:
                            {cacheUsed && (
                              <div className="flex items-center gap-1 text-green-600 text-xs">
                                <Zap className="h-3 w-3" />
                                <span>ABI Cached</span>
                              </div>
                            )}
                          </h4>
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="text-muted-foreground">Name:</span>{' '}
                              {contractInfo.contractName}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Address:</span>{' '}
                              <code className="text-xs">{contractInfo.contractAddress}</code>
                            </div>
                            {contractInfo.isProxy && contractInfo.implementationAddress && (
                              <div>
                                <span className="text-muted-foreground">Implementation:</span>{' '}
                                <code className="text-xs">
                                  {contractInfo.implementationAddress}
                                </code>
                              </div>
                            )}
                            {contractInfo.isProxy && (
                              <div>
                                <span className="text-muted-foreground">Proxy Type:</span>{' '}
                                <span className="text-blue-600">
                                  {contractInfo.proxyType?.toUpperCase() || 'UNKNOWN'}
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">Verified:</span>{' '}
                              <span
                                className={
                                  contractInfo.isVerified ? 'text-green-600' : 'text-red-600'
                                }
                              >
                                {contractInfo.isVerified ? 'Yes' : 'No'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button onClick={decode} disabled={!txHash || isLoading} className="flex-1">
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Fetching & Decoding...
                            </>
                          ) : (
                            'Decode'
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={reset}
                          title="Reset all fields"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Manual Mode */}
                  <TabsContent value="manual" className="mt-6">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="abi" className="text-sm font-medium mb-2 block">
                          ABI JSON
                        </label>
                        <Textarea
                          id="abi"
                          placeholder='[{"type":"function","name":"transfer","inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}]}]'
                          value={abiJson}
                          onChange={e => setAbiJson(e.target.value)}
                          className="h-[200px] font-mono text-sm resize-none overflow-y-auto"
                        />
                      </div>

                      <div>
                        <label htmlFor="data" className="text-sm font-medium mb-2 block">
                          Encoded Data
                        </label>
                        <Input
                          id="data"
                          placeholder="0xa9059cbb000000000000000000000000742d35cc..."
                          value={encodedData}
                          onChange={e => setEncodedData(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={decode}
                          disabled={!abiJson || !encodedData || isLoading}
                          className="flex-1"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Decoding...
                            </>
                          ) : (
                            'Decode'
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={reset}
                          title="Reset all fields"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Results Display - Show only when successful */}
            {!error && (functionInfo || decodedResult) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {functionInfo ? (
                      <>
                        Function:{' '}
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {functionInfo.signature}
                        </code>
                        {cacheUsed && (
                          <div className="flex items-center gap-1 text-green-600 text-xs">
                            <Zap className="h-3 w-3" />
                            <span>Cache Hit</span>
                          </div>
                        )}
                      </>
                    ) : (
                      'Decoded Data'
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {decodedResult && decodedResult.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground w-12">
                              #
                            </th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">
                              Name
                            </th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground w-24">
                              Type
                            </th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">
                              Data
                            </th>
                            <th className="w-16"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {decodedResult.map((param, index) => (
                            <tr key={index} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-3 text-sm font-mono">
                                {param.parameterIndex}
                              </td>
                              <td className="py-3 px-3 text-sm font-medium">{param.name}</td>
                              <td className="py-3 px-3">
                                <span
                                  className={`text-xs font-mono px-2 py-1 rounded-full ${getTypeColor(param.type)}`}
                                >
                                  {param.type}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="max-w-md">
                                  <code
                                    className={`text-sm break-all font-mono ${getValueColor(param.type)}`}
                                  >
                                    {param.displayValue}
                                  </code>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleCopy(param.displayValue, `param-${index}`)
                                      }
                                      className="h-8 w-8 p-0"
                                    >
                                      {copied === `param-${index}` ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{copied === `param-${index}` ? 'Copied!' : 'Copy value'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Copy All Button */}
                  {decodedResult && decodedResult.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const allParams = decodedResult
                                .map(
                                  param =>
                                    `${param.parameterIndex} ${param.name} (${param.type}): ${param.displayValue}`
                                )
                                .join('\n');
                              handleCopy(allParams, 'all-params');
                            }}
                            className="w-full"
                          >
                            {copied === 'all-params' ? (
                              <>
                                <Check className="mr-2 h-4 w-4 text-green-600" />
                                Copied All Parameters!
                              </>
                            ) : (
                              <>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy All Parameters
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {copied === 'all-params'
                              ? 'All parameters copied!'
                              : 'Copy all decoded parameters'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Error Display - Show only when there's an error */}
            {error && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Decoding Error</CardTitle>
                  <CardDescription>
                    Unable to decode the provided data. Please check your inputs below.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="text-sm text-destructive font-mono whitespace-pre-wrap">
                      {error}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
