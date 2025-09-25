import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAbiDecoder } from '@/hooks/useAbiDecoder';
import { Copy, Loader2, RotateCcw, Check } from 'lucide-react';

export function AbiDecoder() {
  const {
    abiJson,
    encodedData,
    functionInfo,
    decodedResult,
    isLoading,
    error,
    setAbiJson,
    setEncodedData,
    decode,
    reset
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
      value: 'text-blue-700 dark:text-blue-300'
    },
    bool: {
      type: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950',
      value: 'text-green-700 dark:text-green-300'
    },
    number: {
      type: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950',
      value: 'text-purple-700 dark:text-purple-300'
    },
    bytes: {
      type: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950',
      value: 'text-orange-700 dark:text-orange-300'
    },
    tuple: {
      type: 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-950',
      value: 'text-pink-700 dark:text-pink-300'
    },
    default: {
      type: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950',
      value: 'text-gray-700 dark:text-gray-300'
    }
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

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>ABI Decoder</CardTitle>
            <CardDescription>
              Enter your contract's ABI and encoded transaction data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="abi" className="text-sm font-medium mb-2 block">
                  ABI JSON
                </label>
                <Textarea
                  id="abi"
                  placeholder='[{"type":"function","name":"transfer","inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}]}]'
                  value={abiJson}
                  onChange={(e) => setAbiJson(e.target.value)}
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
                  onChange={(e) => setEncodedData(e.target.value)}
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
          </CardContent>
        </Card>

        {/* Results Display - Show only when successful */}
        {!error && (functionInfo || decodedResult) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {functionInfo ? (
                  <>
                    Function: <code className="text-sm bg-muted px-2 py-1 rounded">{functionInfo.signature}</code>
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
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground w-12">#</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground w-24">Type</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Data</th>
                        <th className="w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {decodedResult.map((param, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-3 text-sm font-mono">{param.parameterIndex}</td>
                          <td className="py-3 px-3 text-sm font-medium">{param.name}</td>
                          <td className="py-3 px-3">
                            <span className={`text-xs font-mono px-2 py-1 rounded-full ${getTypeColor(param.type)}`}>
                              {param.type}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="max-w-md">
                              <code className={`text-sm break-all font-mono ${getValueColor(param.type)}`}>
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
                                  onClick={() => handleCopy(param.displayValue, `param-${index}`)}
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
                            .map((param) => `${param.parameterIndex} ${param.name} (${param.type}): ${param.displayValue}`)
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
                      <p>{copied === 'all-params' ? 'All parameters copied!' : 'Copy all decoded parameters'}</p>
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
                <p className="text-sm text-destructive font-mono whitespace-pre-wrap">{error}</p>
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