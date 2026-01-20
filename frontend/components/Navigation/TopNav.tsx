"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Newspaper, Users, BrainCircuit, LogIn, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/Theme/ThemeToggle';
import { useAuthStore } from '@/store/useAuthStore';
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
  const router = useRouter();
  const { isAuthenticated, user, checkAuth, logout } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-6 inset-x-0 z-50 flex justify-center pointer-events-none"
    >
      <header className="pointer-events-auto flex items-center justify-between gap-4 pl-3 pr-3 py-2 rounded-full border border-white/10 bg-background/60 backdrop-blur-2xl shadow-2xl shadow-black/10 ring-1 ring-white/20 dark:ring-white/10 w-fit max-w-[95vw] md:max-w-5xl transition-all duration-500 hover:bg-background/80 hover:ring-white/30 hover:shadow-primary/5">
        {/* Logo - Compact Version */}
        <Link href="/" className="flex items-center gap-2 pr-2 group flex-shrink-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-linear-to-tr from-primary/20 via-primary/10 to-transparent group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-500 ring-1 ring-primary/20 group-hover:scale-110 group-active:scale-95">
            <BrainCircuit className="h-4 w-4 text-primary group-hover:rotate-12 transition-transform duration-500 ease-out" />
          </div>
          <span className="md:hidden lg:block text-base font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-foreground via-foreground/90 to-foreground/70 font-heading group-hover:to-foreground transition-all duration-500">
            Zerocoke
          </span>
        </Link>

        {/* Separator */}
        <div className="h-5 w-px bg-linear-to-b from-transparent via-border/60 to-transparent hidden md:block" />

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
                className="relative group/nav-item"
              >
                <div className={cn(
                  "relative flex items-center gap-2 px-3 py-2 rounded-full text-[13px] font-medium transition-all duration-300",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}>
                  {isActive && (
                    <motion.div
                      layoutId="activeTopNavPill"
                      className="absolute inset-0 bg-primary shadow-[0_0_20px_-5px_var(--color-primary)] rounded-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  {/* Hover background for non-active items */}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-full bg-muted/0 group-hover/nav-item:bg-muted/60 transition-colors duration-300" />
                  )}

                  <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                    <Icon className={cn("h-4 w-4 transition-transform duration-300 group-hover/nav-item:scale-110", isActive && "stroke-[2.5px]")} />
                    <span className="hidden sm:inline-block tracking-tight">{item.title}</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Separator */}
        <div className="h-5 w-px bg-linear-to-b from-transparent via-border/60 to-transparent hidden md:block" />

        {/* Right Side */}
        <div className="flex items-center gap-2">
          <div className="bg-background/40 backdrop-blur-sm rounded-full border border-white/5 hover:border-white/20 transition-colors duration-300">
            <ThemeToggle />
          </div>

          {/* Auth */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-1">
              <Link
                href={`/profile/${user?.username}`}
                className="group flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted/50 transition-all ring-1 ring-transparent hover:ring-border/40"
              >
                <div className="h-7 w-7 rounded-full bg-linear-to-br from-primary/10 to-secondary/10 ring-1 ring-primary/20 flex items-center justify-center text-xs font-bold text-primary group-hover:scale-105 transition-transform duration-300">
                  {user?.display_name?.slice(0, 1).toUpperCase() || 'U'}
                </div>
                <span className="hidden md:inline-block max-w-[80px] truncate group-hover:translate-x-0.5 transition-transform duration-300">
                  {user?.display_name}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all hover:scale-105 active:scale-95"
                title="로그아웃"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="group flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 active:translate-y-0 active:scale-95 whitespace-nowrap flex-shrink-0"
            >
              <LogIn className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
              <span className="hidden sm:inline-block">로그인</span>
            </Link>
          )}
        </div>
      </header>
    </motion.div>
  );
};
