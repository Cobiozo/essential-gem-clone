import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

interface ClientSliderProps {
  clients: number;
  onClientsChange: (value: number) => void;
  minClients: number;
  maxClients: number;
}

const markers = [1, 250, 500, 1000, 5000, 10000];

// Convert client value to slider position (0-100)
const valueToSlider = (value: number): number => {
  for (let i = 0; i < markers.length - 1; i++) {
    if (value <= markers[i + 1]) {
      const range = markers[i + 1] - markers[i];
      const progress = (value - markers[i]) / range;
      return (i + progress) * (100 / (markers.length - 1));
    }
  }
  return 100;
};

// Convert slider position (0-100) to client value
const sliderToValue = (sliderPos: number): number => {
  const segment = sliderPos / (100 / (markers.length - 1));
  const i = Math.floor(segment);
  const progress = segment - i;
  
  if (i >= markers.length - 1) return markers[markers.length - 1];
  
  return Math.round(markers[i] + progress * (markers[i + 1] - markers[i]));
};

export function ClientSlider({ clients, onClientsChange, minClients, maxClients }: ClientSliderProps) {
  const [inputValue, setInputValue] = useState(clients.toString());

  // Sync when external value changes (e.g., from slider)
  useEffect(() => {
    setInputValue(clients.toString());
  }, [clients]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits
    const value = e.target.value.replace(/[^0-9]/g, '');
    setInputValue(value);
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue);
    if (isNaN(parsed) || parsed < minClients) {
      onClientsChange(minClients);
    } else if (parsed > maxClients) {
      onClientsChange(maxClients);
    } else {
      onClientsChange(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      e.currentTarget.blur();
    }
  };

  const handleSliderChange = (sliderValues: number[]) => {
    const newValue = sliderToValue(sliderValues[0]);
    onClientsChange(Math.min(Math.max(newValue, minClients), maxClients));
  };

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
                value={[valueToSlider(clients)]}
                onValueChange={handleSliderChange}
                min={0}
                max={100}
                step={0.1}
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleKeyDown}
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
