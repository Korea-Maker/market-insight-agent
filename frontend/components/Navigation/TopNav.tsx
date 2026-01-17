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

export const TopNav = () => {
  const pathname = usePathname();

  return (
    <motion.header 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 left-0 right-0 z-50 h-16 w-full glass border-b border-border/40"
    >
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-primary/10 rounded-lg ring-1 ring-primary/20">
            <BrainCircuit className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-foreground to-foreground/70 font-heading">
            Zerocoke
          </span>
        </div>

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
                className="relative group"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTopNav"
                    className="absolute inset-0 bg-primary/10 rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200",
                    isActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground group-hover:text-foreground group-hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
                  <span>{item.title}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
};
