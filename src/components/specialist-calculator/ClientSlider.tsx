import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

interface ClientSliderProps {
  clients: number;
  onClientsChange: (value: number) => void;
  minClients: number;
  maxClients: number;
}

export function ClientSlider({ clients, onClientsChange, minClients, maxClients }: ClientSliderProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || minClients;
    onClientsChange(Math.min(Math.max(value, minClients), maxClients));
  };

  const markers = [1, 250, 500, 1000, 5000, 10000];

  const formatMarker = (value: number) => {
    if (value >= 10000) return "10 000+";
    if (value >= 1000) return value.toLocaleString('pl-PL').replace(',', ' ');
    return value.toString();
  };

  return (
    <Card>
      <CardContent className="py-6">
        <div className="space-y-4">
          <label className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Liczba klientów (6-miesięczna kuracja)
          </label>
          
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <Slider
                value={[clients]}
                onValueChange={(value) => onClientsChange(value[0])}
                min={minClients}
                max={maxClients}
                step={1}
                className="w-full"
              />
              
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                {markers.map((marker) => (
                  <span key={marker}>{formatMarker(marker)}</span>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <Input
                type="number"
                value={clients}
                onChange={handleInputChange}
                min={minClients}
                max={maxClients}
                className="w-20 text-center text-lg font-semibold"
              />
              <span className="text-xs text-muted-foreground mt-1">osób</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
