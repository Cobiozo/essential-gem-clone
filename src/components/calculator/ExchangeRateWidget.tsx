import { useNbpExchangeRate } from "@/hooks/useNbpExchangeRate";
import { useSyncNbpRate } from "@/hooks/useSyncNbpRate";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Save } from "lucide-react";

interface ExchangeRateWidgetProps {
  variant?: "light" | "dark";
}

export function ExchangeRateWidget({ variant = "light" }: ExchangeRateWidgetProps) {
  const { data, isLoading, error, refetch, isFetching } = useNbpExchangeRate();
  const syncRate = useSyncNbpRate();
  const { currency, setCurrency } = useCurrency();

  const handleSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (data?.rate) {
      await syncRate.mutateAsync(data.rate);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-6 w-32 bg-white/20" />;
  }

  if (error || !data) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-[10px] text-white/60 px-2 py-1 bg-white/10 rounded">
              NBP —
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Kurs niedostępny</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 bg-white/10 rounded-md px-2 py-1">
        {/* NBP Rate */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-[11px] text-white/90 font-medium tabular-nums cursor-default">
              NBP {data.rate.toFixed(2)}
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">1 EUR = {data.rate.toFixed(4)} PLN</p>
            <p className="text-[10px] text-muted-foreground">
              Kurs średni z {new Date(data.date).toLocaleDateString('pl-PL')}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Refresh button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-0.5 hover:bg-white/20 rounded transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 text-white/70 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Odśwież kurs z NBP</p>
          </TooltipContent>
        </Tooltip>

        {/* Sync button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSync}
              disabled={syncRate.isPending}
              className="p-0.5 hover:bg-white/20 rounded transition-colors disabled:opacity-50"
            >
              <Save className={`h-3 w-3 text-white/70 ${syncRate.isPending ? 'animate-pulse' : ''}`} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Synchronizuj kurs do kalkulatorów</p>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="w-px h-3 bg-white/20" />

        {/* Currency Toggle */}
        <div className="flex items-center gap-1">
          <span className={`text-[10px] font-medium transition-colors ${currency === 'EUR' ? 'text-white' : 'text-white/50'}`}>
            EUR
          </span>
          <Switch
            checked={currency === 'PLN'}
            onCheckedChange={(checked) => setCurrency(checked ? 'PLN' : 'EUR')}
            className="h-4 w-7 data-[state=checked]:bg-white/30 data-[state=unchecked]:bg-white/20"
          />
          <span className={`text-[10px] font-medium transition-colors ${currency === 'PLN' ? 'text-white' : 'text-white/50'}`}>
            PLN
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
