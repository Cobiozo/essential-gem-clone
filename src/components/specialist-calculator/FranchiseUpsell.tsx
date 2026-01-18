import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, ArrowRight } from "lucide-react";

export function FranchiseUpsell() {
  return (
    <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
      <CardContent className="py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Myślisz o większej skali?</h3>
              <p className="text-sm text-muted-foreground">
                Sprawdź możliwości dla influencerów z dużym zasięgiem
              </p>
            </div>
          </div>
          <Button variant="outline" className="border-primary/30 hover:bg-primary/10" asChild>
            <a href="/calculator/influencer">
              Kalkulator influencerów
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
