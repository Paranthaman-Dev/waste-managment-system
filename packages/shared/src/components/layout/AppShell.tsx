import React, { useState } from 'react';
import { useAuth } from '../../auth';
import { useRouter } from '../../router';
import { Button } from '../ui/primitives';
import { LogOut, Menu, X, ChevronRight } from 'lucide-react';
import { cn } from '../../utils';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export function AppShell({
  children,
  navItems,
  brand,
  meta,
  activeId,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
  brand: { name: string; mark?: string; sub?: string };
  meta?: string;
  activeId?: string;
}) {
  const { user, role, logout } = useAuth();
  const { pathname, navigate } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentActiveId =
    activeId ||
    navItems.find((item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))
      ?.id ||
    navItems[0]?.id;

  const activeNavItem = navItems.find((i) => i.id === currentActiveId) || navItems[0];

  const handleItemClick = (item: NavItem) => {
    navigate(item.href);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[12px] focus:bg-safety focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-stone lg:bg-surface z-30">
        <div className="flex h-16 items-center gap-2.5 border-b border-stone bg-surface px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink text-paper">
            <span className="mono text-[13px] font-bold">{brand.mark ?? '♻'}</span>
          </div>
          <div className="min-w-0">
            <div className="font-display text-[15px] font-bold tracking-tight text-ink truncate">{brand.name}</div>
            {brand.sub && <p className="mono text-[10px] tracking-widest text-sage">{brand.sub}</p>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {meta ?? 'Navigation'}
          </p>
          <nav className="space-y-0.5" aria-label="Sidebar Navigation">
            {navItems.map((item) => {
              const isActive = item.id === currentActiveId;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-[13px] font-semibold transition-all cursor-pointer',
                    isActive ? 'bg-safety text-white shadow-soft' : 'text-sage hover:bg-paper hover:text-ink',
                  )}
                >
                  <span className={cn('transition-colors', isActive ? 'text-white' : 'text-sage group-hover:text-ink')}>
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'mono rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-widest',
                        isActive ? 'bg-white/20 text-white' : 'bg-paper text-sage border border-stone',
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-stone p-3 space-y-2 bg-paper">
          <div className="flex items-center justify-between gap-2 rounded-[10px] bg-white p-2 border border-stone">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink text-[12px] font-bold text-paper shrink-0">
                {(user?.username || 'U').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">{user?.username ?? 'User'}</p>
                <p className="truncate mono text-[10px] tracking-widest text-sage uppercase capitalize">
                  {role === 'user' ? 'Resident' : role ?? ''}
                </p>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-[12px] h-9 text-muted-foreground hover:text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4 mr-1.5" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:pl-60 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stone bg-paper/90 px-4 sm:px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="grid h-10 w-10 place-items-center rounded-[10px] border border-border bg-surface text-foreground lg:hidden"
              aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink text-paper font-bold text-xs">
                {brand.mark ?? '♻'}
              </div>
              <span className="font-bold text-sm">{brand.name}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span className="font-medium capitalize">{role === 'user' ? 'Resident' : role ?? 'App'}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="font-semibold text-foreground">{activeNavItem?.label || 'Home'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
              Operational
            </span>
          </div>

          {mobileOpen && (
            <div className="absolute top-16 inset-x-0 border-b border-border bg-surface p-4 shadow-xl lg:hidden animate-fade-in space-y-3">
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-[13px] font-semibold',
                      item.id === currentActiveId ? 'bg-safety text-white' : 'bg-surface-muted text-foreground',
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <div className="text-[13px] font-semibold text-foreground">
                  {user?.username} <span className="text-muted-foreground">({role})</span>
                </div>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Sign out
                </Button>
              </div>
            </div>
          )}
        </header>

        <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1400px] w-full mx-auto pb-24 lg:pb-8">
          {children}
        </main>

        <nav
          aria-label="Mobile Bottom Navigation"
          className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-md lg:hidden"
        >
          <div className="mx-auto grid grid-flow-col auto-cols-fr gap-1 px-2 py-1.5">
            {navItems.map((item) => {
              const isActive = item.id === currentActiveId;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center justify-center gap-0.5 rounded-[10px] py-1 text-[10px] font-semibold transition-all',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className={cn('p-1 rounded-lg', isActive ? 'bg-primary-muted' : '')}>{item.icon}</span>
                  <span className="text-center leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
