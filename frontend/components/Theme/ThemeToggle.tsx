"use client";

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: 'light', icon: Sun, label: '라이트' },
    { value: 'dark', icon: Moon, label: '다크' },
    { value: 'system', icon: Monitor, label: '시스템' },
  ] as const;

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "p-2 rounded-md transition-all duration-200",
            "hover:bg-accent",
            theme === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
          title={label}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

// 간단한 토글 버튼 (라이트/다크만)
export function ThemeToggleSimple() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={cn(
        "p-2 rounded-lg transition-all duration-200",
        "hover:bg-accent text-muted-foreground hover:text-foreground"
      )}
      title={resolvedTheme === 'dark' ? '라이트 모드' : '다크 모드'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
