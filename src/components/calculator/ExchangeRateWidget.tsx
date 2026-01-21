import { useNbpExchangeRate } from "@/hooks/useNbpExchangeRate";
import { RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExchangeRateWidgetProps {
  variant?: "light" | "dark";
}

export function ExchangeRateWidget({ variant = "light" }: ExchangeRateWidgetProps) {
  const { data, isLoading, error, refetch, isFetching } = useNbpExchangeRate();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <Skeleton className="h-5 w-28 bg-white/20" />
        <Skeleton className="h-3 w-20 bg-white/10" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-end gap-0.5 opacity-60">
              <span className="text-sm font-medium text-white">
                EUR/PLN —
              </span>
              <span className="text-[10px] text-emerald-200">
                Kurs niedostępny
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Nie udało się pobrać kursu z NBP</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => refetch()}
            className="flex flex-col items-end gap-0.5 bg-white/10 hover:bg-white/15 transition-colors rounded-lg px-3 py-1.5 cursor-pointer group"
            disabled={isFetching}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white">
                1 EUR = {data.rate.toFixed(4)} PLN
              </span>
              <RefreshCw 
                className={`h-3 w-3 text-emerald-200 opacity-0 group-hover:opacity-100 transition-opacity ${isFetching ? 'animate-spin' : ''}`} 
              />
            </div>
            <span className="text-[10px] text-emerald-200">
              NBP • {formatDate(data.date)}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Kurs średni NBP (Tabela A)</p>
          <p className="text-xs text-muted-foreground">Kliknij, aby odświeżyć</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
