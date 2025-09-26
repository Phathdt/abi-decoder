import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAllNetworks, getNetwork } from '@/lib/networks';

interface NetworkSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function NetworkSelector({ value, onValueChange, disabled }: NetworkSelectorProps) {
  const networks = getAllNetworks();
  const currentNetwork = getNetwork(value);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select network">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>{currentNetwork.name}</span>
            <span className="text-muted-foreground text-sm">({currentNetwork.currency})</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {networks.map(({ id, config }) => (
          <SelectItem key={id} value={id}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>{config.name}</span>
              <span className="text-muted-foreground text-sm">({config.currency})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
