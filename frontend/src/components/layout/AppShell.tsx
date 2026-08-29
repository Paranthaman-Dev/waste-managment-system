import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { Button } from '../ui/primitives';
import type { Role } from '../../types/api';

type NavItem = { id: string; label: string; icon: React.ReactNode; badge?: string; disabled?: boolean; href?: string };

function IconHome(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props} aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}
function IconTruck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props} aria-hidden>
      <path d="M14 18V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-6h-6l-3 3v5z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}
function IconMap(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props} aria-hidden>
      <path d="M1 6l7-3 7 3 7-3v14l-7 3-7-3-7 3V6z" />
      <path d="M8 3v14M15 6v14" />
    </svg>
  );
}
function IconRecycle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props} aria-hidden>
      <path d="M7 19H4a1 1 0 0 1-1-1v-1" />
      <path d="M17 5h3a1 1 0 0 1 1 1v1" />
      <path d="M10 7l-3 3 3 3M14 17l3-3-3-3" />
    </svg>
  );
}
function IconUsers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" {...props} aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  );
}

const navByRole: Record<Role, NavItem[]> = {
  user: [
    { id: 'dashboard', label: 'Home', icon: <IconHome className="h-[18px] w-[18px]" /> },
    { id: 'pickups', label: 'Requests', icon: <IconTruck className="h-[18px] w-[18px]" /> },
    { id: 'map', label: 'Bins', icon: <IconMap className="h-[18px] w-[18px]" /> },
    { id: 'profile', label: 'Profile', icon: <IconUsers className="h-[18px] w-[18px]" /> },
  ],
  collector: [
    { id: 'dashboard', label: 'Queue', icon: <IconHome className="h-[18px] w-[18px]" /> },
    { id: 'assigned', label: 'My Route', icon: <IconTruck className="h-[18px] w-[18px]" /> },
    { id: 'schedule', label: 'Schedule', icon: <IconChart className="h-[18px] w-[18px]" /> },
    { id: 'profile', label: 'Profile', icon: <IconUsers className="h-[18px] w-[18px]" /> },
  ],
  recycler: [
    { id: 'dashboard', label: 'Batches', icon: <IconRecycle className="h-[18px] w-[18px]" /> },
    { id: 'mine', label: 'My Batches', icon: <IconTruck className="h-[18px] w-[18px]" /> },
    { id: 'profile', label: 'Profile', icon: <IconUsers className="h-[18px] w-[18px]" /> },
  ],
  management: [
    { id: 'overview', label: 'Overview', icon: <IconChart className="h-[18px] w-[18px]" /> },
    { id: 'bins', label: 'Bins', icon: <IconMap className="h-[18px] w-[18px]" /> },
    { id: 'users', label: 'Users', icon: <IconUsers className="h-[18px] w-[18px]" /> },
    { id: 'reports', label: 'Reports', icon: <IconChart className="h-[18px] w-[18px]" /> },
  ],
};

export function AppShell({
  children,
  activeId,
  onNavigate,
}: {
  children: React.ReactNode;
  activeId?: string;
  onNavigate?: (id: string) => void;
}) {
  const { user, role, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = role ? (navByRole[role] ?? navByRole.user) : navByRole.user;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-foreground focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>

      {/* Sidebar desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[276px] lg:flex-col lg:border-r lg:border-border lg:bg-surface">
        <div className="flex h-[64px] items-center gap-3 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <span className="text-sm font-bold" aria-hidden>♻</span>
          </div>
          <div>
            <p className="text-[15px] font-bold leading-none tracking-tight">Reclaim</p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Enterprise</p>
          </div>
          <span className="ml-auto rounded-full bg-success-muted px-2 py-1 text-[11px] font-semibold text-sage-700 ring-1 ring-sage-200">Live</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-4 rounded-2xl border border-border bg-muted p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-sm font-bold text-white">{(user?.username ?? 'G').slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user?.username ?? 'Guest'}</p>
                <p className="truncate text-xs text-muted-foreground capitalize">
                  {role ?? '—'} • {user?.email ?? ''}
                </p>
              </div>
            </div>
          </div>

          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Navigation</p>
          <nav className="grid gap-1" aria-label="Primary">
            {nav.map((item) => {
              const active = activeId ? item.id === activeId : item.id === nav[0].id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate?.(item.id);
                    const el = document.getElementById(item.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  <span className={active ? 'text-white' : 'text-stone-400'}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-border bg-muted p-4">
            <p className="text-sm font-bold">Operations handbook</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Role-based access, audit trail, and offline-ready maps.</p>
          </div>
        </div>

        <div className="border-t border-border p-3">
          <Button variant="secondary" className="w-full" onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-[276px]">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-surface/80 backdrop-blur">
          <div className="flex h-[64px] items-center gap-3 px-4 sm:px-6">
            <button onClick={() => setMobileOpen((v) => !v)} className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-white lg:hidden" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
              </svg>
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-xs font-bold">♻</div>
              <span className="text-sm font-bold">Reclaim</span>
            </div>
            <div className="hidden md:flex flex-1" />
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" aria-hidden />
              Operational
            </span>
            <span className="hidden lg:inline-flex rounded-full bg-foreground px-2.5 py-1 text-xs font-semibold text-white capitalize">{role ?? 'guest'}</span>
          </div>
          {mobileOpen && (
            <div className="border-t border-border bg-surface px-4 py-3 lg:hidden">
              <nav className="grid gap-1">
                {nav.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate?.(item.id);
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-xl bg-muted px-3 py-3 text-sm font-medium"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </nav>
              <Button variant="secondary" className="mt-3 w-full" onClick={logout}>
                Sign out
              </Button>
            </div>
          )}
        </header>

        <main id="main" className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 pb-24 lg:pb-8">
          {children}
        </main>

        <nav aria-label="Bottom" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-[560px] grid-cols-4 gap-1 px-2 py-2">
            {nav.slice(0, 4).map((item) => {
              const active = activeId ? item.id === activeId : item.id === nav[0].id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate?.(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold ${active ? 'bg-primary text-white' : 'text-muted-foreground'}`}
                >
                  <span className="grid h-6 w-6 place-items-center">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <footer className="border-t border-border/60 bg-surface/60">
          <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-3 px-4 py-6 text-xs sm:flex-row sm:px-6 lg:px-8">
            <span className="font-medium text-muted-foreground">© 2026 Reclaim — Warm paper • Forest • Terracotta • 375 → 1440</span>
            <span className="text-muted-foreground">Build for cities • SOC 2 • 99.9% uptime</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
