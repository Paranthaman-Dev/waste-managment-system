import { useAuth } from '../context/AuthContext';

const roleMeta: Record<string, { label: string; desc: string; accent: string }> = {
  user: { label: 'Resident', desc: 'Request & track pickups', accent: 'bg-emerald-500' },
  collector: { label: 'Collector', desc: 'Field operations', accent: 'bg-blue-500' },
  recycler: { label: 'Recycler', desc: 'Batch processing', accent: 'bg-violet-500' },
  management: { label: 'Operations', desc: 'Control center', accent: 'bg-slate-800' },
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, role, logout } = useAuth();
  const meta = role ? roleMeta[role] ?? roleMeta.user : null;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      {/* Top navigation – elegant glass SaaS */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-[12px] supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Brand – elegant typography */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-soft">
              <span className="text-[11px] font-extrabold tracking-widest">W♻</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-sans text-[17px] font-bold tracking-tight text-slate-900 leading-none">
                Waste<span className="font-light text-slate-500">Flow</span>
                <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-white">SAAS</span>
              </h1>
              <p className="text-[11px] font-medium tracking-wide text-slate-500">Elegant waste operations • SaaS platform</p>
            </div>
            {/* Mobile brand */}
            <div className="sm:hidden">
              <h1 className="font-bold text-[16px] tracking-tight text-slate-900">WasteFlow</h1>
            </div>
          </div>

          {/* Center – role indicator + status – hidden on mobile */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="hidden xl:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold tracking-wide text-slate-600">All systems operational</span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-medium text-slate-500">API 127ms</span>
            </div>
            {meta && (
              <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                <span className={`h-2 w-2 rounded-full ${meta.accent}`} />
                <span className="text-xs font-semibold tracking-tight text-slate-800">{meta.label}</span>
                <span className="hidden xl:inline text-xs text-slate-400">— {meta.desc}</span>
              </div>
            )}
          </div>

          {/* Right – user + actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {(user?.username ?? 'G').slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left leading-none">
                <p className="text-[13px] font-semibold tracking-tight text-slate-900">{user?.username ?? 'Guest'}</p>
                <p className="text-[11px] font-medium text-slate-500 capitalize">{role ?? '—'} • {user?.email?.split('@')[0] ?? 'guest'}</p>
              </div>
              <span className="hidden sm:inline h-4 w-px bg-slate-200" />
              <span className="hidden sm:inline text-[11px] font-semibold uppercase tracking-widest text-slate-400">PRO</span>
            </div>

            {user && (
              <>
                <button
                  onClick={logout}
                  className="hidden sm:inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold tracking-wide text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Sign out
                </button>
                <button
                  onClick={logout}
                  className="sm:hidden grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-white hover:bg-black transition-colors"
                  aria-label="Sign out"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main – elegant canvas */}
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
        {/* Breadcrumb – subtle SaaS */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-500">WasteFlow OS</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-900 capitalize">{role ?? 'dashboard'}</span>
          <span className="hidden sm:inline-flex ml-auto items-center gap-1.5 text-[11px] font-medium tracking-wide text-slate-400">
            <span className="hidden md:inline">Designed for</span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600">375</span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600">768</span>
            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-semibold text-white">1440+</span>
          </span>
        </div>

        <div className="animate-[fade-in_0.4s_ease-out]">{children}</div>
      </main>

      <footer className="border-t border-slate-200/60 bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-4 py-6 text-xs sm:flex-row sm:px-6 lg:px-8">
          <span className="font-medium tracking-tight text-slate-500">
            © 2026 WasteFlow — Elegant SaaS • Glassmorphism • Plus Jakarta Sans
          </span>
          <span className="inline-flex items-center gap-2 font-medium text-slate-400">
            <span className="h-px w-8 bg-slate-200" />
            Built for scale • SOC 2 ready • 99.9% uptime
          </span>
        </div>
      </footer>
    </div>
  );
}

// Elegant SaaS Card – white, soft shadow, 20px radius, subtle
export function Card({ title, children, action, subtitle }: { title: string; children: React.ReactNode; action?: React.ReactNode; subtitle?: string }) {
  return (
    <section className="card-elegant relative overflow-hidden rounded-[20px] p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-sans text-[15px] font-bold tracking-tight text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">{label}</span>
      {children}
      {hint && <span className="text-[11px] leading-relaxed text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-slate-300';

export const buttonClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold tracking-tight text-white shadow-sm hover:bg-[#1D4ED8] hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer';

export const secondaryButtonClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold tracking-tight text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-all cursor-pointer';

export const ghostButtonClass =
  'inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold tracking-wide text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer';

// Keep legacy export for compatibility
export const chromeButtonClass = secondaryButtonClass;
