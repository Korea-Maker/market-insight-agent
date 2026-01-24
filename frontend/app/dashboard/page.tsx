"use client";

import { ChartTabs } from '@/components/Chart/ChartTabs';
import { MarketTicker } from '@/components/Header/MarketTicker';
import MarketInsightPanel from '@/components/Analysis/MarketInsightPanel';
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full space-y-8 pt-24 pb-8"> {/* Added top padding for floating nav */}
      <header className="px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 font-heading"
            >
              Market Overview
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground text-sm font-medium"
            >
              Real-time AI Market Analysis & Insights
            </motion.p>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-full bg-background/50 border border-border/50 backdrop-blur-sm shadow-sm"
          >
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </div>
            <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">LIVE CONNECTION</span>
          </motion.div>
        </div>
        <MarketTicker />
      </header>
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]"
      >
        {/* Main Chart - Large Block */}
        <motion.div variants={item} className="lg:col-span-3 lg:row-span-2 relative group">
          <div className="absolute inset-0 bg-gradient-to-wb from-primary/5 to-transparent rounded-3xl -z-10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="h-full min-h-[500px] rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl shadow-lg hover:shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-4 right-4 z-10 opactiy-50 hover:opacity-100 transition-opacity">
               {/* Chart controls placeholder */}
            </div>
            <ChartTabs />
          </div>
        </motion.div>
        
        {/* AI Market Insight Panel */}
        <motion.div variants={item} className="lg:col-span-1 lg:row-span-2">
          <div className="h-full rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl shadow-lg hover:shadow-xl hover:border-primary/20 transition-all duration-300 overflow-hidden [&>div]:border-0 [&>div]:shadow-none [&>div]:bg-transparent">
            <MarketInsightPanel symbol="BTCUSDT" />
          </div>
        </motion.div>
        
        {/* Bottom Row - Bento Grid items */}
        <motion.div variants={item} className="lg:col-span-2 h-[240px] rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl p-6 shadow-lg hover:shadow-xl hover:border-primary/20 transition-all duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <h3 className="font-semibold text-foreground/80 mb-4 z-10 relative">Sentiment Analysis</h3>
          <div className="h-32 w-full flex items-end gap-2 z-10 relative">
            <div className="w-[10%] h-[40%] bg-primary/20 rounded-t-lg" />
            <div className="w-[10%] h-[70%] bg-primary/40 rounded-t-lg" />
            <div className="w-[10%] h-[50%] bg-primary/30 rounded-t-lg" />
            <div className="w-[10%] h-[80%] bg-primary/60 rounded-t-lg" />
            <div className="w-[10%] h-[60%] bg-primary/50 rounded-t-lg" />
            <div className="w-[10%] h-[90%] bg-primary/80 rounded-t-lg" />
          </div>
          <p className="absolute bottom-6 right-6 text-xs text-muted-foreground font-mono">
            Updated 2s ago
          </p>
        </motion.div>
        
        <motion.div variants={item} className="lg:col-span-2 h-[240px] rounded-3xl border border-white/10 bg-card/40 backdrop-blur-xl p-6 shadow-lg hover:shadow-xl hover:border-primary/20 transition-all duration-300 flex items-center justify-center relative overlow-hidden">
           <div className="text-center space-y-3">
             <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/30 text-2xl">
               📈
             </div>
             <div>
               <h4 className="font-semibold">Portfolio Performance</h4>
               <p className="text-xs text-muted-foreground mt-1">Connect wallet to view analytics</p>
             </div>
           </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
