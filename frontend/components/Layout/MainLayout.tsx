"use client";

import { SidebarNav } from '@/components/Navigation/SidebarNav';
import { useWebSocket } from '@/hooks/useWebSocket';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  // Initialize WebSocket connection globally
  useWebSocket();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Sidebar */}
      <SidebarNav />
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
};
