import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopbar } from './DashboardTopbar';
import { ChatSidebarProvider } from '@/contexts/ChatSidebarContext';
import { ChatSidebarPanel } from '@/components/chat-sidebar/ChatSidebarPanel';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  backTo?: { label: string; path: string } | null;
  isUserMenuOpen?: boolean;
  onUserMenuOpenChange?: (open: boolean) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  title,
  backTo,
  isUserMenuOpen,
  onUserMenuOpenChange,
}) => {
  return (
    <ChatSidebarProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-[hsl(225,50%,6%)] via-[hsl(225,40%,8%)] to-[hsl(230,35%,5%)] dark:from-[hsl(225,50%,6%)] dark:via-[hsl(225,40%,8%)] dark:to-[hsl(230,35%,5%)]">
          <DashboardSidebar />
          <SidebarInset className="flex flex-col flex-1 h-dvh overflow-hidden">
            <DashboardTopbar 
              title={title} 
              backTo={backTo}
              isUserMenuOpen={isUserMenuOpen}
              onUserMenuOpenChange={onUserMenuOpenChange}
            />
            <div className="flex-1 flex overflow-hidden">
              <main className="flex-1 overflow-auto p-4 lg:p-6">
                {children}
              </main>
              <ChatSidebarPanel />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ChatSidebarProvider>
  );
};
