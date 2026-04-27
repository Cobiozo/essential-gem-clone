import React, { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useOmegaTests } from '@/hooks/useOmegaTests';
import { useOmegaTestClients, OmegaTestClientWithStats } from '@/hooks/useOmegaTestClients';
import { OmegaGaugeCharts } from '@/components/omega-tests/OmegaGaugeCharts';
import { OmegaTestForm } from '@/components/omega-tests/OmegaTestForm';
import { OmegaTrendChart } from '@/components/omega-tests/OmegaTrendChart';
import { OmegaSpectrumChart } from '@/components/omega-tests/OmegaSpectrumChart';
import { OmegaTestHistory } from '@/components/omega-tests/OmegaTestHistory';
import { VitalityProgress } from '@/components/omega-tests/VitalityProgress';
import { ClientList } from '@/components/omega-tests/ClientList';
import { ClientFormDialog } from '@/components/omega-tests/ClientFormDialog';
import { ClientDetailDrawer } from '@/components/omega-tests/ClientDetailDrawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, User, Users } from 'lucide-react';

const OmegaTests: React.FC = () => {
  const { tests, addTest, updateTest, deleteTest, latestTest } = useOmegaTests({ scope: 'self' });
  const { clients, isLoading: clientsLoading, addClient, updateClient, deleteClient } = useOmegaTestClients();

  const [tab, setTab] = useState<'self' | 'clients'>('self');
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<OmegaTestClientWithStats | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  const openAddClient = () => {
    setEditingClient(null);
    setClientDialogOpen(true);
  };

  const openEditClient = (client: OmegaTestClientWithStats) => {
    setEditingClient(client);
    setClientDialogOpen(true);
  };

  const handleSelectClient = (id: string) => {
    setSelectedClientId(id);
    setDrawerOpen(true);
  };

  const handleDeleteClient = (id: string) => {
    if (confirm('Usunąć klienta wraz ze wszystkimi jego testami? Tej operacji nie można cofnąć.')) {
      deleteClient.mutate(id);
    }
  };

  return (
    <DashboardLayout title="Baza testów" backTo={{ label: 'Strona główna', path: '/dashboard' }}>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Database className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">
              Baza testów Omega
            </h1>
            <p className="text-xs text-muted-foreground italic">
              „Testuję, nie zgaduję" — pełna kontrola nad wynikami swoimi i klientów (cykl 120 dni)
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'self' | 'clients')} className="space-y-4">
          <TabsList>
            <TabsTrigger value="self" className="gap-2">
              <User className="h-3.5 w-3.5" /> Moje testy
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="h-3.5 w-3.5" /> Testy klientów
              {clients.length > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">{clients.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="self" className="space-y-4 mt-0">
            <VitalityProgress tests={tests} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 space-y-4">
                <OmegaGaugeCharts
                  omega6_3_ratio={latestTest?.omega6_3_ratio ?? null}
                  omega3_index={latestTest?.omega3_index ?? null}
                />
                <OmegaTrendChart tests={tests} />
                <OmegaSpectrumChart tests={tests} />
              </div>

              <div className="lg:col-span-4 space-y-4">
                <OmegaTestForm
                  onSubmit={(data) => addTest.mutate(data)}
                  isLoading={addTest.isPending}
                />
                <OmegaTestHistory
                  tests={tests}
                  onDelete={(id) => deleteTest.mutate(id)}
                  onEdit={(id, data) => updateTest.mutate({ id, ...data })}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="mt-0">
            <ClientList
              clients={clients}
              isLoading={clientsLoading}
              onAdd={openAddClient}
              onSelect={handleSelectClient}
              onEdit={openEditClient}
              onDelete={handleDeleteClient}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ClientFormDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        initial={editingClient}
        isLoading={addClient.isPending || updateClient.isPending}
        onSubmit={(data) => {
          if (editingClient) {
            updateClient.mutate(
              { id: editingClient.id, ...data },
              { onSuccess: () => setClientDialogOpen(false) }
            );
          } else {
            addClient.mutate(data, { onSuccess: () => setClientDialogOpen(false) });
          }
        }}
      />

      <ClientDetailDrawer
        client={selectedClient}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </DashboardLayout>
  );
};

export default OmegaTests;
