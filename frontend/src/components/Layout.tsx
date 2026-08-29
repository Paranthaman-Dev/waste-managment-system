import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Inline SVG icons — no emoji, accessible — Heroicons style
function IconDashboard(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IconMap(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props} aria-hidden="true">
      <path d="M1 6l7-3 7 3 7-3v14l-7 3-7-3-7 3V6z" />
      <path d="M8 3v14M15 6v14" />
    </svg>
  );
}
function IconTruck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props} aria-hidden="true">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-6h-6l-2 2v5z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}
function IconRecycle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props} aria-hidden="true">
      <path d="M7 19H4a1 1 0 0 1-1-1v-2" />
      <path d="M17 5h3a1 1 0 0 1 1 1v2" />
      <path d="M10 7l-3 3 3 3" />
      <path d="M14 17l3-3-3-3" />
      <path d="M7 14l2.5-4 2.5 4" />
    </svg>
  );
}
function IconUsers(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props} aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props} aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M18 17V9M13 17V5M8 17v-3" />
    </svg>
  );
}

type NavItem = { id: string; label: string; icon: React.ReactNode; badge?: string; disabled?: boolean };

const navByRole: Record<string, NavItem[]> = {
  user: [
    { id: 'dashboard', label: 'Dashboard', icon: <IconDashboard className="h-[18px] w-[18px]" /> },
    { id: 'pickups', label: 'Pickups', icon: <IconTruck className="h-[18px] w-[18px]" />, badge: 'Live' },
    { id: 'map', label: 'Bins Map', icon: <IconMap className="h-[18px] w-[18px]" /> },
    { id: 'analytics', label: 'Impact', icon: <IconChart className="h-[18px] w-[18px]" />, disabled: true },
  ],
  collector: [
    { id: 'dashboard', label: 'Operations', icon: <IconDashboard className="h-[18px] w-[18px]" /> },
    { id: 'route', label: 'My Route', icon: <IconTruck className="h-[18px] w-[18px]" />, badge: '4' },
    { id: 'map', label: 'Bins Map', icon: <IconMap className="h-[18px] w-[18px]" /> },
    { id: 'history', label: 'History', icon: <IconChart className="h-[18px] w-[18px]" />, disabled: true },
  ],
  recycler: [
    { id: 'dashboard', label: 'Batches', icon: <IconRecycle className="h-[18px] w-[18px]" /> },
    { id: 'queue', label: 'Queue', icon: <IconDashboard className="h-[18px] w-[18px]" /> },
    { id: 'proofs', label: 'Proofs', icon: <IconChart className="h-[18px] w-[18px]" /> },
  ],
  management: [
    { id: 'dashboard', label: 'Overview', icon: <IconDashboard className="h-[18px] w-[18px]" /> },
    { id: 'bins', label: 'Bins', icon: <IconMap className="h-[18px] w-[18px]" /> },
    { id: 'users', label: 'Users', icon: <IconUsers className="h-[18px] w-[18px]" /> },
    { id: 'reports', label: 'Reports', icon: <IconChart className="h-[18px] w-[18px]" /> },
  ],
};

const roleMeta: Record<string, { label: string; desc: string }> = {
  user: { label: 'Resident', desc: 'Request & track' },
  collector: { label: 'Collector', desc: 'Field ops' },
  recycler: { label: 'Recycler', desc: 'Processing' },
  management: { label: 'Control Center', desc: 'Admin' },
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, role, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = role ? navByRole[role] ?? navByRole.user : navByRole.user;
  const meta = role ? roleMeta[role] : { label: 'Platform', desc: 'WasteFlow' };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      {/* Skip link — a11y */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>

      {/* Desktop sidebar — 280px */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[280px] lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
        <div className="flex h-[64px] items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-soft">
            <span className="text-xs font-extrabold tracking-widest" aria-hidden>
              W♻
            </span>
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight text-slate-900 leading-none">
              Waste<span className="font-light text-slate-500">Flow</span>
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Enterprise • SaaS</p>
          </div>
          <span className="ml-auto rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">Live</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                {(user?.username ?? 'G').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold tracking-tight text-slate-900">{user?.username ?? 'Guest'}</p>
                <p className="truncate text-xs font-medium text-slate-500 capitalize">
                  {meta.label} • {user?.email ?? '—'}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white border border-slate-200 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Role</p>
                <p className="text-xs font-bold capitalize text-slate-700">{role ?? '—'}</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Plan</p>
                <p className="text-xs font-bold text-slate-700">Pro</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Uptime</p>
                <p className="text-xs font-bold text-emerald-600">99.9%</p>
              </div>
            </div>
          </div>

          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Navigation</p>
          <nav className="grid gap-1" aria-label="Primary">
            {nav.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={item.id === 'dashboard' ? 'page' : undefined}
                aria-disabled={item.disabled}
                onClick={(e) => item.disabled && e.preventDefault()}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  item.id === 'dashboard'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : item.disabled
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={item.id === 'dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}>{item.icon}</span>
                <span className="flex-1 text-left tracking-tight">{item.label}</span>
                {item.badge && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.id === 'dashboard' ? 'bg-white/15 text-white' : 'bg-primary text-white'}`}>{item.badge}</span>}
                {item.disabled && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Soon</span>}
              </a>
            ))}
          </nav>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold tracking-tight text-slate-900">Need help?</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">Ops handbook, SLA, and audit trail — all in one place.</p>
            <a href="#docs" className="mt-3 inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-black transition-colors">
              Open docs →
            </a>
          </div>
        </div>

        <div className="border-t border-slate-100 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
          <p className="mt-2 text-center text-[11px] font-medium tracking-wide text-slate-400">© 2026 WasteFlow • SOC 2 • GDPR</p>
        </div>
      </aside>

      {/* Main column — offset for sidebar */}
      <div className="lg:pl-[280px]">
        {/* Top bar — glass, sticky */}
        <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-[12px] supports-[backdrop-filter]:bg-white/70">
          <div className="flex h-[64px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
              </svg>
            </button>

            {/* Mobile brand */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white text-xs font-bold">W♻</div>
              <span className="text-sm font-bold tracking-tight text-slate-900">WasteFlow</span>
              <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">SAAS</span>
            </div>

            {/* Search — command palette affordance */}
            <div className="hidden md:flex flex-1 max-w-[560px] items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-slate-400" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20L16 16" />
              </svg>
              <input
                placeholder="Search bins, pickups, users…  (⌘K)"
                className="flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none"
                aria-label="Search"
              />
              <span className="hidden lg:inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold tracking-wide text-slate-500">⌘K</span>
            </div>

            <div className="flex-1 lg:hidden" />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                <span className="hidden lg:inline">All systems</span> operational
              </span>
              <span className="hidden xl:inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">{role ?? '—'}</span>
              <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm text-slate-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M6 8a6 6 0 0 1 12 0c0 7-6 11-6 11S6 15 6 8z" />
                  <path d="M10 22h4" />
                </svg>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white lg:hidden">
                {(user?.username ?? 'G').slice(0, 1).toUpperCase()}
              </div>
              <button
                onClick={logout}
                className="hidden lg:inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          </div>

          {/* Mobile drawer */}
          {mobileOpen && (
            <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4">
              <nav className="grid gap-1" aria-label="Mobile">
                {nav.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${item.id === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-700 bg-slate-50'}`}
                  >
                    {item.icon}
                    {item.label}
                    {item.badge && <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">{item.badge}</span>}
                  </a>
                ))}
              </nav>
              <button onClick={logout} className="mt-3 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white">
                Sign out
              </button>
            </div>
          )}
        </header>

        {/* Breadcrumb + main */}
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <a href="#" className="font-medium text-slate-500 hover:text-slate-700">
              Home
            </a>
            <span className="text-slate-300" aria-hidden>
              /
            </span>
            <span className="font-semibold text-slate-900 capitalize">{role ?? 'dashboard'}</span>
            <span className="text-slate-300" aria-hidden>
              /
            </span>
            <span className="font-medium text-slate-500">{meta.label}</span>
            <span className="ml-auto hidden items-center gap-2 sm:inline-flex text-[11px] font-medium tracking-wide text-slate-400">
              <span>Responsive</span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600">375</span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600">768</span>
              <span className="rounded-full bg-slate-900 px-2 py-0.5 font-semibold text-white">1440+</span>
            </span>
          </nav>

          <main id="main" className="animate-[fade-in_0.4s_ease-out] pb-20 lg:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile bottom nav — ≤5, 44px, safe area */}
        <nav aria-label="Bottom" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-[560px] grid-cols-4 gap-1 px-2 py-2">
            {nav.slice(0, 4).map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={item.id === 'dashboard' ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold tracking-wide transition-colors ${
                  item.id === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="grid h-6 w-6 place-items-center">{item.icon}</span>
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Footer — enterprise */}
        <footer className="border-t border-slate-200/60 bg-white/60 backdrop-blur">
          <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-4 py-6 text-xs sm:flex-row sm:px-6 lg:px-8">
            <span className="font-medium tracking-tight text-slate-500">© 2026 WasteFlow Enterprise — Glassmorphism • Swiss Grid • Plus Jakarta Sans</span>
            <span className="inline-flex items-center gap-2 font-medium text-slate-400">
              <span className="h-1 w-6 rounded-full bg-primary/20" />
              <span className="h-1 w-6 rounded-full bg-emerald-200" />
              <span className="h-1 w-6 rounded-full bg-slate-200" />
              Built for scale • SOC 2 • 99.9% uptime
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Primitives — elegant SaaS, a11y, 44px, 4.5:1
export function Card({ title, children, action, subtitle, id }: { title: string; children: React.ReactNode; action?: React.ReactNode; subtitle?: string; id?: string }) {
  return (
    <section id={id} className="card-elegant relative overflow-hidden rounded-[20px] p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold tracking-tight text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 max-w-[48ch] text-sm leading-relaxed text-slate-500">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}

export function Field({ label, children, hint, id, error }: { label: string; children: React.ReactNode; hint?: string; id?: string; error?: string }) {
  return (
    <label htmlFor={id} className="grid gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">{label}</span>
      {children}
      {error ? (
        <span id={`${id}-error`} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="text-[11px] leading-relaxed text-slate-400">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-slate-50 disabled:text-slate-400';

export const buttonClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold tracking-tight text-white shadow-sm hover:bg-[#1D4ED8] hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer';

export const secondaryButtonClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold tracking-tight text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-all cursor-pointer';

export const ghostButtonClass =
  'inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold tracking-wide text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer';

export const chromeButtonClass = secondaryButtonClass;
