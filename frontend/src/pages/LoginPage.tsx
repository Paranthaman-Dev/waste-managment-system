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
    <div className="min-h-screen bg-midnight text-paper grid place-items-center p-4 relative overflow-hidden">
      {/* midnight + grid + scanline from body, plus hero glows */}
      <div className="absolute inset-0 bg-midnight" />
      <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-neon-cyan/10 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-[560px] w-[560px] rounded-full bg-neon-pink/10 blur-[130px] pointer-events-none" />
      <div className="absolute inset-0 bg-grid opacity-[0.04] pointer-events-none" />

      <div className="relative w-full max-w-6xl grid gap-6 lg:grid-cols-[1.15fr_0.95fr] items-center">
        {/* Left – Luxury Typography Hero – Conceptual Sketch */}
        <div className="hidden lg:block p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-neon-cyan">WASTE LUX — Y2K / CYBERCORE / SKETCH</p>
          <h1 className="mt-4 font-display text-hero text-white leading-[0.88]">
            WASTE
            <span className="block font-serif italic font-normal text-neon-cyan">Lux</span>
            <span className="block text-2xl font-mono font-medium tracking-[0.35em] text-white/40 mt-2">OPS HUD — v2.4</span>
          </h1>
          <p className="mt-6 max-w-[44ch] font-mono text-sm leading-relaxed text-white/60">
            Efficient, unambiguous waste ops. Luxury typography meets Y2K chrome and cyber HUD. 4 roles, real APIs, persisted Postgres, sketch-grid precision.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { k: 'Roles', v: '4 — USER / COLLECTOR / RECYCLER / MGMT' },
              { k: 'DB', v: 'Postgres + Alembic + FK' },
              { k: 'Auth', v: 'Argon2 + JWT + 5/min' },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">{s.k}</p>
                <p className="mt-1 font-mono text-xs font-semibold leading-tight text-white">{s.v}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-white/30">
            <span className="h-px w-12 bg-neon-cyan/50" /> Efficient • Compatible • 375 768 1024 1440
          </div>
        </div>

        {/* Right – Y2K Chrome Login – HUD */}
        <form onSubmit={submit} className="relative w-full max-w-[440px] mx-auto lg:mx-0 rounded-[24px] border border-white/10 bg-white p-7 sm:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,255,255,0.08)]">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-70" />
          <div className="absolute right-4 top-4 h-6 w-6 border-r border-t border-ink/10 rounded-tr-xl pointer-events-none" />
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-teal-600">Waste Ops — Secure Access</p>
          <h2 className="mt-2 font-display text-3xl font-black tracking-tighter text-ink">Sign in</h2>
          <p className="mt-2 font-mono text-xs leading-relaxed text-ink/60">
            Username + password only. Demo <span className="font-bold text-ink">admin / admin123</span> prefilled after <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-neon-cyan">seed</span>.
          </p>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-1.5">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/70">Username</span>
              <input
                className="min-h-[44px] w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 font-mono text-sm font-medium text-ink placeholder:text-ink/30 focus:border-neon-cyan focus:shadow-neon-cyan outline-none"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="admin"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/70">Password</span>
              <input
                className="min-h-[44px] w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 font-mono text-sm font-medium text-ink placeholder:text-ink/30 focus:border-neon-cyan focus:shadow-neon-cyan outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-mono text-xs font-semibold text-red-700" role="alert">
                {error}
              </div>
            )}

            <button
              disabled={loading}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.14em] text-white shadow-hud hover:bg-black hover:shadow-neon-cyan active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <span className="text-neon-cyan">→</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {[
                { r: 'user', u: 'user1', p: 'user123' },
                { r: 'collector', u: 'collector1', p: 'collector123' },
              ].map((d) => (
                <button
                  key={d.r}
                  type="button"
                  onClick={() => { setUsername(d.u); setPassword(d.p); }}
                  className="rounded-xl border border-ink/10 bg-chrome-100 px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-ink hover:bg-white hover:border-neon-cyan/30 hover:shadow-neon-cyan transition-all"
                >
                  {d.r}
                </button>
              ))}
            </div>
            <p className="text-center font-mono text-[10px] uppercase tracking-widest text-ink/35">Efficient • 44px touch • 4.5:1 contrast • Keyboard ✓</p>
          </div>
        </form>
      </div>
    </div>
  );
}
