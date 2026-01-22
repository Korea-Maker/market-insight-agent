"use client";

import { TopNav } from '@/components/Navigation/TopNav';
import { useWebSocket } from '@/hooks/useWebSocket';
import { motion } from 'framer-motion';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps): React.ReactElement {
  // Initialize WebSocket connection globally
  useWebSocket();

  return (
    <div className="flex flex-col min-h-screen w-full bg-background text-foreground transition-colors duration-300 font-sans">
      {/* Top Navigation */}
      <TopNav />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative overflow-hidden">
        {/* Ambient Background Effects - z-0 레이어 */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] opacity-40 animate-pulse-slow" />
          <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] bg-secondary/20 rounded-full blur-[120px] opacity-30 delay-1000" />
          <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[30%] bg-primary/10 rounded-full blur-[120px] opacity-30 delay-2000" />
        </div>
        {/* Grid Background - pointer-events-none 필수 */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none z-0" />
        {/* Content Area - z-10 레이어 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
          className="container mx-auto p-4 lg:p-6 pb-20 relative z-10"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};
