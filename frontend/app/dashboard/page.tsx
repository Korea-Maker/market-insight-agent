"use client";

import { TradingChart } from '@/components/Chart/TradingChart';
import { MarketTicker } from '@/components/Header/MarketTicker';
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
    <div className="flex flex-col h-full p-6 lg:p-8 gap-8 overflow-y-auto">
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70 font-heading"
            >
              Zerocoke Dashboard
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm text-muted-foreground mt-1"
            >
              제로콕(Zerocoke) AI 기반 실시간 시장 분석
            </motion.p>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs font-mono text-green-500">SYSTEM ONLINE</span>
          </motion.div>
        </div>
        <MarketTicker />
      </header>
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1"
      >
        {/* Main Chart Area - Takes up 2 columns */}
        <motion.div variants={item} className="lg:col-span-2 w-full h-full min-h-[500px]">
          <div className="h-full rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
            <TradingChart />
          </div>
        </motion.div>
        
        {/* AI Insights Sidebar - Takes up 1 column */}
        <motion.div variants={item} className="lg:col-span-1 w-full">
          <div className="w-full h-full min-h-[500px] p-6 bg-card/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm flex flex-col gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary/70" />
                  AI Insights
                </h3>
              </div>
              
              <div className="p-6 rounded-xl bg-muted/30 border border-dashed border-border/60 flex flex-col items-center justify-center text-center space-y-3 min-h-[240px]">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground block mb-1">AI Models Initializing</span>
                  <p className="text-xs text-muted-foreground/60">
                    Sentiment Analysis & Predictive models will appear here.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Status</h4>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-sm p-3 rounded-lg bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">Data Ingestor</span>
                    <span className="flex items-center gap-1.5 text-xs text-green-500 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm p-3 rounded-lg bg-muted/20 border border-border/30">
                    <span className="text-muted-foreground">Analysis Engine</span>
                    <span className="flex items-center gap-1.5 text-xs text-yellow-500 font-medium bg-yellow-500/10 px-2 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                      Standby
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        
        {/* Placeholder for future charts (Row 2) */}
        <motion.div variants={item} className="lg:col-span-2 min-h-[300px] rounded-2xl border border-dashed border-border/50 flex items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors">
          <div className="text-center space-y-2">
            <span className="text-3xl opacity-20">📊</span>
            <p className="text-sm text-muted-foreground">Multi-Chart Grid (Future)</p>
          </div>
        </motion.div>
        <motion.div variants={item} className="lg:col-span-1 min-h-[300px] rounded-2xl border border-dashed border-border/50 flex items-center justify-center bg-muted/5 hover:bg-muted/10 transition-colors">
          <div className="text-center space-y-2">
            <span className="text-3xl opacity-20">📑</span>
            <p className="text-sm text-muted-foreground">Order Book (Future)</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
