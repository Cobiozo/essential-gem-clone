import { useNbpExchangeRate } from "@/hooks/useNbpExchangeRate";
import { useSyncNbpRate } from "@/hooks/useSyncNbpRate";
import { RefreshCw, Save } from "lucide-react";
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
  const syncRate = useSyncNbpRate();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.rate) {
      await syncRate.mutateAsync(data.rate);
    }
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
    <div className="flex items-center gap-2">
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
                  className={`h-3 w-3 text-emerald-200 opacity-0 group-hover:opacity-100 transition-opacity ${isFetching ? 'animate-spin opacity-100' : ''}`} 
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

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSync}
              disabled={syncRate.isPending || !data}
              className="flex items-center gap-1 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg px-2.5 py-2 text-white text-xs font-medium"
            >
              <Save className={`h-3.5 w-3.5 ${syncRate.isPending ? 'animate-pulse' : ''}`} />
              <span className="hidden sm:inline">
                {syncRate.isPending ? 'Synchronizuję...' : 'Synchronizuj kurs'}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Zapisz aktualny kurs NBP do obliczeń</p>
            <p className="text-xs text-muted-foreground">Zaktualizuje oba kalkulatory</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
