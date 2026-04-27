import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { OmegaTestClient } from '@/hooks/useOmegaTestClients';
import { useOmegaTests } from '@/hooks/useOmegaTests';
import { ClientTestForm } from './ClientTestForm';
import { OmegaTestHistory } from './OmegaTestHistory';
import { OmegaTrendChart } from './OmegaTrendChart';
import { OmegaGaugeCharts } from './OmegaGaugeCharts';
import { Mail, Phone, StickyNote } from 'lucide-react';

interface ClientDetailDrawerProps {
  client: OmegaTestClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ClientDetailDrawer: React.FC<ClientDetailDrawerProps> = ({ client, open, onOpenChange }) => {
  const { tests, addTest, updateTest, deleteTest, latestTest } = useOmegaTests({
    scope: 'client',
    clientId: client?.id ?? null,
  });

  if (!client) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">
            {client.first_name} {client.last_name}
          </SheetTitle>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
            {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>}
            {client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>}
          </div>
          {client.notes && (
            <p className="text-xs text-muted-foreground italic flex items-start gap-1 mt-2">
              <StickyNote className="h-3 w-3 mt-0.5" />„{client.notes}"
            </p>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {tests.length > 0 && (
            <>
              <OmegaGaugeCharts
                omega6_3_ratio={latestTest?.omega6_3_ratio ?? null}
                omega3_index={latestTest?.omega3_index ?? null}
              />
              {tests.length >= 2 && <OmegaTrendChart tests={tests} />}
            </>
          )}

          <ClientTestForm
            client={client}
            onSubmit={(data) => addTest.mutate(data)}
            isLoading={addTest.isPending}
          />

          <OmegaTestHistory
            tests={tests}
            onDelete={(id) => deleteTest.mutate(id)}
            onEdit={(id, data) => updateTest.mutate({ id, ...data })}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
