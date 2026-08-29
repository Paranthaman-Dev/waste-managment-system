import { useAuth } from '../context/AuthContext';

// Luxury Cybercore – Y2K Chrome + Midnight OLED + Conceptual Sketch
export function Layout({ children }: { children: React.ReactNode }) {
  const { user, role, logout } = useAuth();

  return (
    <div className="min-h-screen bg-midnight text-paper selection:bg-neon-cyan selection:text-ink">
      {/* Sketch grid + scanline are in body::before/after */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/[0.04] via-transparent to-neon-pink/[0.04] pointer-events-none" />
        <div className="relative mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-neon-cyan to-teal-600 text-ink font-mono text-sm font-bold shadow-neon-cyan">W♻</div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-neon-cyan/70">WASTE OPS — HUD v2.4</p>
              <h1 className="font-display text-[22px] leading-none tracking-tighter text-white">
                WASTE<span className="font-serif italic font-normal text-neon-cyan">Lux</span>
                <span className="ml-2 font-mono text-[11px] font-medium tracking-widest text-white/40">Y2K / CYBERCORE / SKETCH</span>
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">Role-based ops • efficient • unambiguous</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-neon-green shadow-[0_0_8px_rgba(0,255,136,0.8)]" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-white/60">System · Online</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white px-3 py-2 shadow-hud">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-ink to-midnight grid place-items-center text-white font-mono text-xs font-bold">
                {(user?.username ?? 'G').slice(0,1).toUpperCase()}
              </div>
              <div className="pr-1 text-left leading-none">
                <p className="font-display text-sm font-bold tracking-tight text-ink">{user?.username ?? 'Guest'}</p>
                <p className="font-mono text-[11px] uppercase tracking-widest text-teal-800/60">{role ?? '—'} · {user?.email?.split('@')[0] ?? 'guest'}</p>
              </div>
            </div>
            {user && (
              <button
                onClick={logout}
                className="hidden sm:inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-widest text-white backdrop-blur hover:bg-white hover:text-ink transition-colors"
              >
                Logout
              </button>
            )}
            {user && (
              <button
                onClick={logout}
                className="sm:hidden grid h-11 w-11 place-items-center rounded-xl bg-white text-ink"
                aria-label="Logout"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        {/* Y2K chrome divider */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">
        {/* Blueprint label */}
        <div className="mb-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/25">
          <span className="h-px flex-1 bg-white/10" />
          <span>CONCEPTUAL SKETCH — GRID 24 — HUD LAYER 02</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        {children}
      </main>

      <footer className="border-t border-white/5 bg-ink/50 py-6 backdrop-blur">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-widest text-white/30">
          <span>© 2026 WasteLux — Luxury Typography • Y2K Chrome • Cybercore HUD • Sketch Grid</span>
          <span className="flex items-center gap-2">
            <span className="h-1 w-12 rounded-full bg-gradient-to-r from-neon-cyan to-neon-pink opacity-60" />
            Efficient • Compatible • 375 768 1024 1440
          </span>
        </div>
      </footer>
    </div>
  );
}

// HUD Card – white, blur, neon border, sketch
export function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-[20px] border border-teal-300/30 bg-white p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35),0_0_0_1px_rgba(0,255,255,0.08)]">
      {/* chrome highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-80" />
      {/* sketch corner */}
      <div className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r border-t border-teal-900/10 rounded-tr-xl" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="font-display text-[18px] font-extrabold tracking-tighter text-ink">
          {title}
          <span className="ml-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-neon-cyan/60">— SKETCH 0{Math.floor(Math.random()*9)+1}</span>
        </h2>
        {action}
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-900/70">{label}</span>
      {children}
      {hint && <span className="font-mono text-[10px] text-teal-900/40">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'min-h-[44px] w-full rounded-xl border border-teal-900/15 bg-white px-3.5 py-2.5 font-mono text-[14px] font-medium text-ink placeholder:text-teal-900/30 focus:border-neon-cyan focus:bg-white focus:shadow-neon-cyan outline-none transition-all';

export const buttonClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-ink px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-white shadow-hud hover:bg-black hover:shadow-neon-cyan active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all';

export const chromeButtonClass =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl chrome px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink hover:shadow-neon-cyan active:scale-[0.98] transition-all';

export const ghostButtonClass =
  'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-teal-900/15 bg-white px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-ink hover:border-neon-cyan hover:text-neon-cyan hover:shadow-neon-cyan transition-all';
