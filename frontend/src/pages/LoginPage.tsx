import { FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle gradient backdrop – elegant SaaS */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-50" />
      <div className="absolute -top-24 right-0 h-[480px] w-[640px] rounded-full bg-gradient-to-br from-blue-100 to-indigo-50 blur-[80px] opacity-60 pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-slate-100 to-blue-50 blur-[80px] opacity-70 pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #0F172A 1px, transparent 0)`, backgroundSize: '32px 32px' }} />

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1200px] items-center gap-8 px-4 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-12">
        {/* Left – SaaS marketing – elegant typography */}
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-slate-600 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            WasteFlow OS • Live operations • 99.9% uptime
          </div>
          <h1 className="mt-6 font-sans text-[52px] font-bold leading-[0.95] tracking-tight text-slate-900">
            Waste operations,
            <span className="block font-light text-slate-500">made elegant.</span>
            <span className="block mt-2 text-[14px] font-semibold uppercase tracking-[0.18em] text-primary">SaaS platform — Scale ready</span>
          </h1>
          <p className="mt-5 max-w-[48ch] text-[15px] leading-relaxed text-slate-600">
            Manage pickups, fleets, and recycling with a calm, efficient interface. Built for cities and enterprises — glassmorphism, real Postgres, and role-based clarity.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { label: 'Roles', value: 'User • Collector • Recycler • Admin', sub: 'RBAC + JWT' },
              { label: 'Data', value: 'Postgres + Alembic • FK • Audit', sub: 'Persisted' },
              { label: 'Experience', value: 'Glass • 60fps • A11y 4.5:1', sub: 'Elegant' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{s.label}</p>
                <p className="mt-1.5 text-xs font-semibold leading-snug tracking-tight text-slate-900">{s.value}</p>
                <p className="text-[11px] font-medium text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-slate-200 to-slate-300 shadow-sm" />
              ))}
            </div>
            <p className="text-xs font-medium leading-tight text-slate-600">
              Trusted by ops teams <span className="font-semibold text-slate-900">in Chennai</span>
              <span className="block text-[11px] text-slate-400">Efficient • Compatible • 375 → 1440</span>
            </p>
          </div>

          <p className="mt-8 inline-flex items-center gap-2 text-xs font-medium tracking-wide text-slate-400">
            <span className="h-px w-10 bg-slate-200" />
            Elegant SaaS • Glassmorphism • Plus Jakarta Sans
          </p>
        </div>

        {/* Right – Login card – glass elegant */}
        <div className="flex justify-center lg:justify-end">
          <form onSubmit={submit} className="w-full max-w-[420px] rounded-[24px] border border-slate-200 bg-white p-6 sm:p-8 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white text-xs font-extrabold">W♻</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">WasteFlow • Secure access</p>
                <h2 className="font-sans text-xl font-bold tracking-tight text-slate-900 -mt-0.5">Welcome back</h2>
              </div>
              <span className="ml-auto hidden sm:inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-emerald-700 ring-1 ring-emerald-200">Live</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Sign in with username + password. Demo <span className="font-semibold text-slate-900">admin / admin123</span> prefilled after seed.
            </p>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">Username</span>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-slate-300"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="admin"
                  required
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">Password</span>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-slate-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                  {error}
                </div>
              )}

              <button
                disabled={loading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold tracking-tight text-white shadow-sm hover:bg-[#1D4ED8] hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
                ].map((d) => (
                  <button
                    key={d.r}
                    type="button"
                    onClick={() => {
                      setUsername(d.u);
                      setPassword(d.p);
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold tracking-wide text-slate-700 hover:bg-white hover:border-slate-300 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    {d.r}
                  </button>
                ))}
              </div>
              <p className="text-center text-[11px] font-medium tracking-wide text-slate-400">Quick fill • 44px touch • Keyboard accessible • Glass 16px</p>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm text-slate-500">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </span>
                <div className="text-xs leading-tight">
                  <p className="font-semibold text-slate-700">Enterprise security</p>
                  <p className="text-slate-500">Argon2 • JWT rotation • 5/min rate limit</p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
