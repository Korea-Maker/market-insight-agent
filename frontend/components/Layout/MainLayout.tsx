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
      <main className="flex-1 w-full relative">
        <div className="absolute inset-0 bg-linear-to-tr from-primary/5 via-transparent to-secondary/5 pointer-events-none fixed" />
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
