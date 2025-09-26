import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getAllNetworks, getNetwork } from '@/lib/networks';

interface NetworkSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function NetworkSelector({ value, onValueChange, disabled }: NetworkSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const networks = getAllNetworks();
  const currentNetwork = getNetwork(value);

  const mainnets = networks.filter(({ config }) => !config.isTestnet);
  const testnets = networks.filter(({ config }) => config.isTestnet);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10"
          disabled={disabled}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span className="truncate text-left">{currentNetwork.name}</span>
            <span className="text-muted-foreground text-sm flex-shrink-0">({currentNetwork.currency})</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search networks..." className="h-9" />
          <CommandEmpty>No network found.</CommandEmpty>
          <CommandList>
            <CommandGroup heading="Mainnets">
              {mainnets.map(({ id, config }) => (
                <CommandItem
                  key={id}
                  value={`${config.name} ${config.currency} ${id}`}
                  onSelect={() => {
                    onValueChange(id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="truncate">{config.name}</span>
                    <span className="text-muted-foreground text-sm flex-shrink-0">({config.currency})</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Testnets">
              {testnets.map(({ id, config }) => (
                <CommandItem
                  key={id}
                  value={`${config.name} ${config.currency} ${id}`}
                  onSelect={() => {
                    onValueChange(id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                    <span className="truncate">{config.name}</span>
                    <span className="text-muted-foreground text-sm flex-shrink-0">({config.currency})</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
