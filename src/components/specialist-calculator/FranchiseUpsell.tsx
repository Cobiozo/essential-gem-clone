import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FranchiseUpsell() {
  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-2">Myślisz o większej skali?</h3>
            <p className="text-sm text-muted-foreground">
              Jako partner Pure Life Center masz również możliwość budowania modelu franczyzowego. 
              Otrzymujesz prowizję od obrotu swoich partnerów (5-9%) oraz dodatkowe 20% od kluczowych 
              partnerów biznesowych. To sposób na skalowanie biznesu bez konieczności osobistej obsługi 
              każdego klienta.
            </p>
          </div>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white flex-shrink-0">
            Zapytaj o Franczyzę
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
