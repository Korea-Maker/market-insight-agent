"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Newspaper, Users, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/Theme/ThemeToggle';
import { motion } from 'framer-motion';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    title: '대시보드',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: '속보',
    href: '/news',
    icon: Newspaper,
  },
  {
    title: '커뮤니티',
    href: '/community',
    icon: Users,
  },
];

export function TopNav(): React.ReactElement {
  const pathname = usePathname();

  return (
    <motion.div 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-6 inset-x-0 z-50 flex justify-center pointer-events-none"
    >
      <header className="pointer-events-auto flex items-center justify-between gap-4 px-2 p-2 rounded-full border border-white/10 bg-background/60 backdrop-blur-2xl shadow-xl ring-1 ring-black/5 dark:ring-white/10 w-fit max-w-[90vw] md:max-w-2xl">
        {/* Logo - Compact Version */}
        <Link href="/" className="flex items-center gap-2 pl-3 pr-2 group">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-tr from-primary/20 to-secondary/20 group-hover:from-primary/30 group-hover:to-secondary/30 transition-all duration-300">
            <BrainCircuit className="h-4 w-4 text-primary group-hover:rotate-12 transition-transform duration-300" />
          </div>
          <span className="md:hidden lg:block text-base font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/80 font-heading">
            Zerocoke
          </span>
        </Link>

        {/* Separator */}
        <div className="h-6 w-px bg-border/50 hidden md:block" />

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href === '/dashboard' && pathname === '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative"
              >
                <div className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                  isActive 
                    ? "text-primary-foreground" // Active text color changed to contrast with indicator
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}>
                  {isActive && (
                    <motion.div
                      layoutId="activeTopNavPill"
                      className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/20"
                      initial={false}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline-block">{item.title}</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Separator */}
        <div className="h-6 w-px bg-border/50 hidden md:block" />

        {/* Right Side */}
        <div className="flex items-center gap-2 pr-1">
          <div className="bg-background/50 rounded-full">
            <ThemeToggle />
          </div>
        </div>
      </header>
    </motion.div>
  );
};
