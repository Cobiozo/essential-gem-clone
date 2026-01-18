import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";

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

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Liczba klientów
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Input
            type="number"
            value={clients}
            onChange={handleInputChange}
            min={minClients}
            max={maxClients}
            className="w-24 text-center text-lg font-semibold"
          />
          <span className="text-muted-foreground">klientów</span>
        </div>
        
        <Slider
          value={[clients]}
          onValueChange={(value) => onClientsChange(value[0])}
          min={minClients}
          max={maxClients}
          step={1}
          className="w-full"
        />
        
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{minClients}</span>
          <span>{maxClients}</span>
        </div>
      </CardContent>
    </Card>
  );
}
