import React from 'react';
import { Card } from '@/components/ui/card';
import { Code } from 'lucide-react';

const PROJECT_REF = 'xzlhssqqbajqhnsmbucf';
const API_BASE = `https://${PROJECT_REF}.supabase.co/functions/v1/public-api`;

const SCOPE_TABLE: Array<{ resource: string; method: string; scope: string; example: string }> = [
  { resource: 'contacts', method: 'GET', scope: 'contacts:read', example: `${API_BASE}?resource=contacts&leader_id=<uuid>` },
  { resource: 'contacts', method: 'POST', scope: 'contacts:write', example: `${API_BASE}?resource=contacts` },
  { resource: 'events', method: 'GET', scope: 'events:read', example: `${API_BASE}?resource=events` },
  { resource: 'event-registrations', method: 'GET', scope: 'registrations:read', example: `${API_BASE}?resource=event-registrations&event_id=<uuid>` },
  { resource: 'auto-webinar-stats', method: 'GET', scope: 'autowebinar-stats:read', example: `${API_BASE}?resource=auto-webinar-stats&event_id=<uuid>` },
];

export const IntegrationDocsBlock: React.FC = () => {
  return (
    <Card className="p-6 bg-muted/40">
      <div className="flex items-center gap-2 mb-3">
        <Code className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold">Dokumentacja dla integratora</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Zewnętrzna aplikacja powinna wysyłać żądania na poniższy URL z nagłówkiem
        <code className="mx-1 px-1.5 py-0.5 rounded bg-background text-xs">Authorization: Bearer &lt;klucz&gt;</code>.
        Limit: 60 zapytań/minutę na klucz.
      </p>

      <div className="space-y-2 mb-4">
        <div className="text-xs font-medium text-muted-foreground">Przykład (curl):</div>
        <pre className="bg-background border rounded-md p-3 text-xs overflow-x-auto">
{`curl -H "Authorization: Bearer plk_live_..." \\
  "${API_BASE}?resource=contacts"`}
        </pre>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Resource</th>
              <th className="py-2 pr-3 font-medium">Metoda</th>
              <th className="py-2 pr-3 font-medium">Wymagany scope</th>
              <th className="py-2 font-medium">Endpoint</th>
            </tr>
          </thead>
          <tbody>
            {SCOPE_TABLE.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-2 pr-3 font-mono">{row.resource}</td>
                <td className="py-2 pr-3 font-mono">{row.method}</td>
                <td className="py-2 pr-3">
                  <code className="px-1.5 py-0.5 rounded bg-background text-[11px]">{row.scope}</code>
                </td>
                <td className="py-2 font-mono text-[11px] text-muted-foreground break-all">{row.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
