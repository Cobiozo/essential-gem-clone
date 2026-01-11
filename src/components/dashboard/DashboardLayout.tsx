import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopbar } from './DashboardTopbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <SidebarInset>
          <DashboardTopbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
