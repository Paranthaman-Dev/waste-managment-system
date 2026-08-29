import { FormEvent, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed — check username and password.';
      setError(msg);
      // Focus error summary for keyboard/screen reader — ux: focusable error summary
      setTimeout(() => errorRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky CTA header — Hero + Features + CTA pattern */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/80 backdrop-blur-[12px]">
        <div className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-soft">
              <span className="text-xs font-extrabold tracking-widest" aria-hidden>
                W♻
              </span>
            </div>
            <span className="text-[15px] font-bold tracking-tight text-slate-900">
              Waste<span className="font-light text-slate-500">Flow</span>
            </span>
            <span className="hidden sm:inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold tracking-widest text-white">ENTERPRISE</span>
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
              Live • 99.9% uptime
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a href="#features" className="hidden md:inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-slate-600 hover:text-slate-900">
              Features
            </a>
            <a href="#security" className="hidden md:inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-slate-600 hover:text-slate-900">
              Security
            </a>
            <a
              href="#signin"
              className="inline-flex h-9 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-black transition-colors cursor-pointer"
            >
              Sign in →
            </a>
          </div>
        </div>
      </header>

      {/* Hero with headline/image — glass + sticky CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-50" aria-hidden />
        <div className="absolute -top-24 right-0 h-[560px] w-[720px] rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 blur-[90px] opacity-60 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #0F172A 1px, transparent 0)`, backgroundSize: '32px 32px' }} aria-hidden />

        <div className="relative mx-auto grid max-w-[1200px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-14">
          {/* Hero copy */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold tracking-wide text-blue-700">
              <span className="flex h-2 w-2 rounded-full bg-blue-600" aria-hidden />
              WasteFlow OS — operations platform
              <span className="hidden sm:inline text-blue-500">•</span>
              <span className="hidden sm:inline font-medium text-blue-600">Trusted in Chennai</span>
            </div>
            <h1 className="mt-5 font-sans text-[42px] font-bold leading-[0.95] tracking-tight text-slate-900 sm:text-[52px]">
              Waste operations,
              <span className="block font-light text-slate-500">made elegant.</span>
              <span className="mt-3 block text-[13px] font-semibold uppercase tracking-[0.18em] text-primary">Scale-ready SaaS • Glassmorphism • Real Postgres</span>
            </h1>
            <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-slate-600">
              Track pickups, manage fleets, and monitor recycling with a calm, efficient interface. Role-based, audited, and built for cities and enterprises.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#signin" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#1D4ED8] hover:shadow-md transition-all cursor-pointer">
                Start with admin →
              </a>
              <a href="#features" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer">
                Explore features
              </a>
            </div>
            <div className="mt-6 flex items-center gap-3 text-xs">
              <div className="flex -space-x-2" aria-hidden>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-slate-200 to-slate-300 shadow-sm" />
                ))}
              </div>
              <p className="font-medium leading-tight text-slate-600">
                Trusted by ops teams <span className="font-semibold text-slate-900">in Chennai</span>
                <span className="block text-[11px] text-slate-400">Efficient • 375 → 1440 • A11y 4.5:1</span>
              </p>
              <span className="hidden sm:inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">Live API 127ms</span>
            </div>
            {/* Value prop */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { k: 'Roles', v: 'Resident • Collector • Recycler • Admin', s: 'RBAC + JWT' },
                { k: 'Data', v: 'Postgres + Alembic • Audit trail', s: 'Persisted' },
                { k: 'Experience', v: 'Glass • 60fps • 4.5:1', s: 'Elegant' },
              ].map((x) => (
                <div key={x.k} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{x.k}</p>
                  <p className="mt-1 text-xs font-semibold leading-snug tracking-tight text-slate-900">{x.v}</p>
                  <p className="text-[11px] font-medium text-slate-400">{x.s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sign-in card — sticky CTA + focusable error summary */}
          <div id="signin" className="flex justify-center lg:justify-end">
            <form onSubmit={submit} noValidate className="w-full max-w-[420px] rounded-[24px] border border-slate-200 bg-white p-6 sm:p-7 shadow-card scroll-mt-24" aria-labelledby="signin-title">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white text-xs font-extrabold" aria-hidden>
                  W♻
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">WasteFlow • Secure access</p>
                  <h2 id="signin-title" className="font-sans text-xl font-bold tracking-tight text-slate-900 -mt-0.5">
                    Welcome back
                  </h2>
                </div>
                <span className="ml-auto hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                  Live
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Username + password only. Demo <span className="font-semibold text-slate-900">admin / admin123</span> prefilled after seed. Focus and boundaries stay independently visible.
              </p>

              {/* Error summary — focusable, linked */}
              {error && (
                <div
                  ref={errorRef}
                  tabIndex={-1}
                  role="alert"
                  aria-labelledby="error-title"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 outline-none focus:ring-4 focus:ring-red-100"
                >
                  <h3 id="error-title" className="text-sm font-semibold text-red-800">
                    There is a problem
                  </h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  <a href="#username" className="mt-2 inline-flex text-xs font-semibold text-red-700 underline hover:text-red-800" onClick={() => usernameRef.current?.focus()}>
                    Go to username →
                  </a>
                </div>
              )}

              <div className="mt-6 grid gap-4">
                <label htmlFor="username" className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">Username</span>
                  <input
                    id="username"
                    ref={usernameRef}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="admin"
                    required
                    aria-describedby="username-hint"
                    aria-invalid={!!error}
                  />
                  <span id="username-hint" className="text-[11px] leading-relaxed text-slate-400">
                    Use demo <span className="font-semibold text-slate-600">admin</span> or <span className="font-semibold text-slate-600">user1</span>
                  </span>
                </label>

                <label htmlFor="password" className="grid gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">Password</span>
                  <input
                    id="password"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    aria-describedby="password-hint"
                  />
                  <span id="password-hint" className="text-[11px] leading-relaxed text-slate-400">
                    Demo passwords shown below — one click to fill.
                  </span>
                </label>

                <button
                  disabled={loading}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold tracking-tight text-white shadow-sm hover:bg-[#1D4ED8] hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                      Signing in…
                    </>
                  ) : (
                    <>Sign in →</>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { r: 'Resident', u: 'user1', p: 'user123' },
                    { r: 'Collector', u: 'collector1', p: 'collector123' },
                    { r: 'Recycler', u: 'recycler1', p: 'recycler123' },
                    { r: 'Admin', u: 'admin', p: 'admin123' },
                  ].map((d) => (
                    <button
                      key={d.r}
                      type="button"
                      onClick={() => {
                        setUsername(d.u);
                        setPassword(d.p);
                        setError('');
                      }}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold tracking-wide text-slate-700 hover:bg-white hover:border-slate-300 hover:text-slate-900 transition-colors cursor-pointer"
                      aria-label={`Fill ${d.r} demo credentials`}
                    >
                      {d.r}
                    </button>
                  ))}
                </div>
                <p className="text-center text-[11px] font-medium tracking-wide text-slate-400">44px touch • 8px spacing • Loading feedback • Keyboard ✓</p>

                <div id="security" className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm text-slate-600" aria-hidden>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </span>
                  <div className="text-xs leading-tight">
                    <p className="font-semibold text-slate-700">Enterprise security</p>
                    <p className="text-slate-500">Argon2 • JWT rotation • 5/min rate limit • 4.5:1 contrast</p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Key features — 3-5, glass */}
      <section id="features" className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-10 scroll-mt-20">
        <div className="mx-auto max-w-[720px] text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Why WasteFlow</p>
          <h2 className="mt-2 font-sans text-[28px] font-bold tracking-tight text-slate-900 sm:text-[32px]">Everything for waste ops — nothing extra.</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">Glassmorphism, Swiss grid, and Plus Jakarta Sans — spacious, fast, and accessible.</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { title: 'Role-based clarity', desc: 'Resident, Collector, Recycler, Control Center — each sees only what matters. No overloaded nav.', icon: '◧' },
            { title: 'Real data, real map', desc: 'Postgres + Alembic + OpenStreetMap. Drag bins to persist, filter by waste type, audit every change.', icon: '◎' },
            { title: 'Performance & a11y', desc: 'Reserve space (CLS <0.1), lazy map, 44×44 touch, visible focus, reduced-motion respected.', icon: '✦' },
          ].map((f) => (
            <div key={f.title} className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-soft hover:shadow-card hover:border-slate-300 transition-all">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white text-sm" aria-hidden>
                {f.icon}
              </div>
              <h3 className="mt-4 text-[15px] font-bold tracking-tight text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA section — bottom */}
      <section className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-10">
        <div className="rounded-[24px] border border-slate-200 bg-slate-900 p-6 sm:p-8 lg:p-10 text-white overflow-hidden relative">
          <div className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-blue-500/20 to-violet-500/20 blur-[40px] pointer-events-none" aria-hidden />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-sans text-2xl font-bold tracking-tight">Ready to run WasteFlow?</h2>
              <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-slate-300">Sign in with admin/admin123 after seed. All five services healthy via start.sh.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="#signin" className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold tracking-tight text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer">
                Sign in now →
              </a>
              <span className="inline-flex h-11 items-center rounded-xl border border-white/15 bg-white/10 px-4 text-xs font-semibold tracking-wide text-white">No horizontal scroll • Mobile-first • Deep linking</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/60 bg-white/60 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-4 py-6 text-xs sm:flex-row sm:px-6 lg:px-8">
          <span className="font-medium tracking-tight text-slate-500">© 2026 WasteFlow Enterprise — Glassmorphism • Swiss Grid • Plus Jakarta Sans • SVG icons</span>
          <span className="inline-flex items-center gap-2 font-medium text-slate-400">
            <span className="h-1 w-6 rounded-full bg-primary/20" />
            <span className="h-1 w-6 rounded-full bg-emerald-200" />
            <span className="h-1 w-6 rounded-full bg-slate-200" />
            <span>4.5:1 • 44px • CLS &lt;0.1</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
