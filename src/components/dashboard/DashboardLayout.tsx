import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopbar } from './DashboardTopbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  isUserMenuOpen?: boolean;
  onUserMenuOpenChange?: (open: boolean) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  title,
  isUserMenuOpen,
  onUserMenuOpenChange,
}) => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-[hsl(225,50%,6%)] via-[hsl(225,40%,8%)] to-[hsl(230,35%,5%)] dark:from-[hsl(225,50%,6%)] dark:via-[hsl(225,40%,8%)] dark:to-[hsl(230,35%,5%)]">
        <DashboardSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <DashboardTopbar 
            title={title} 
            isUserMenuOpen={isUserMenuOpen}
            onUserMenuOpenChange={onUserMenuOpenChange}
          />
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
