import React, { FormEvent, useState, useRef, useEffect } from 'react';
import { useAuth } from '../../auth';
import { apiRequest } from '../../api';
import { Button, Input, Label } from '../ui/primitives';

export function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [liveKg, setLiveKg] = useState(842);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setLiveKg((k) => k + Math.floor(Math.random() * 3)), 3000);
    return () => clearInterval(id);
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Check your username and password.');
      setTimeout(() => errorRef.current?.focus(), 30);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, phone: phone || undefined }),
      });
      setInfo('Account created. Sign in now.');
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
      setTimeout(() => errorRef.current?.focus(), 30);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <header className="sticky top-0 z-40 border-b border-stone bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-[52px] max-w-[1280px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="mono text-[11px] font-bold tracking-widest text-sage border border-stone px-2 py-1 rounded">MRF-01 • CHENNAI</span>
            <span className="hidden sm:inline font-display text-[15px] font-bold tracking-tight">RECLAIM</span>
            <span className="hidden sm:inline h-4 w-px bg-stone" aria-hidden />
            <span className="hidden sm:inline text-xs font-medium text-sage">Civic Waste OS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex mono text-[11px] tracking-widest text-sage">OPS • SHIFT A</span>
            <a href="#auth" className="inline-flex h-8 items-center rounded-full bg-safety px-4 text-xs font-bold tracking-wide text-white hover:bg-[#E64400] transition-colors">Sign in</a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 sm:px-6 py-8 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-start">
          <div className="wm-ticket p-6 sm:p-8 pl-10 sm:pl-12">
            <div className="wm-ticket-stamp">DIVERTED</div>
            <p className="mono text-[11px] tracking-[0.18em] text-sage font-bold">WEIGHBRIDGE TICKET — LOT #842 • 29 AUG 2026</p>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="mono text-[56px] sm:text-[72px] font-bold tracking-tighter leading-none">{liveKg.toLocaleString('en-IN')}</span>
              <span className="mono text-sm font-bold tracking-widest text-sage">kg</span>
              <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded-full bg-foreground text-paper px-2.5 py-1 mono text-[11px] font-bold tracking-widest">LIVE • SCALE-02</span>
            </div>
            <p className="font-display text-[22px] font-bold leading-tight tracking-tight mt-2">Waste is material, <span className="font-normal text-sage">not trash.</span></p>
            <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-sage">Every kilogram weighed, routed, and recovered. Reclaim is the operating system for a circular city — resident request → collector route → recycler proof.</p>

            <div className="wm-conveyor mt-6" aria-hidden />
            <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-stone bg-paper p-3">
                <p className="mono text-[11px] font-bold tracking-widest text-sage">REQUEST</p>
                <p className="mt-1 font-semibold leading-tight">Resident pins location</p>
                <p className="text-sage">Under 30 seconds • any device</p>
              </div>
              <div className="rounded-xl border border-stone bg-paper p-3">
                <p className="mono text-[11px] font-bold tracking-widest text-sage">COLLECT</p>
                <p className="mt-1 font-semibold leading-tight">Collector executes route</p>
                <p className="text-sage">en route → collected</p>
              </div>
              <div className="rounded-xl border border-stone bg-white p-3 ring-1 ring-safety/10">
                <p className="mono text-[11px] font-bold tracking-widest text-safety">RECOVER</p>
                <p className="mt-1 font-semibold leading-tight">Recycler proves recovery</p>
                <p className="text-sage">photo • audit</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 mono text-[11px] tracking-widest text-sage">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-safety" /> 3 BINS DEPLOYED</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-ink" /> 7 USERS VERIFIED</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-sage" /> 99.9% UPTIME</span>
            </div>
          </div>

          <div id="auth" className="scroll-mt-20">
            <div className="rounded-[16px] border border-stone bg-white p-5 sm:p-6 shadow-card">
              <div className="flex items-center gap-2 mono text-[11px] font-bold tracking-widest text-sage">
                <span className="h-2 w-2 rounded-full bg-safety animate-pulse" aria-hidden /> SITE BOARD • SIGN IN
                <span className="ml-auto hidden sm:inline font-normal normal-case tracking-normal text-sage">MRF-01 • Gate 02</span>
              </div>
              <h2 className="font-display text-[22px] font-bold tracking-tight mt-2">Enter the yard</h2>
              <p className="text-sm leading-relaxed text-sage mt-1">Username + password. Demo <span className="font-semibold text-ink">admin/admin123</span> after seed.</p>

              <div className="mt-4 flex rounded-full bg-paper p-1 border border-stone">
                <button onClick={() => setMode('login')} className={`flex-1 rounded-full py-2 text-xs font-bold tracking-wide ${mode === 'login' ? 'bg-ink text-paper shadow' : 'text-sage'}`}>Sign in</button>
                <button onClick={() => setMode('register')} className={`flex-1 rounded-full py-2 text-xs font-bold tracking-wide ${mode === 'register' ? 'bg-ink text-paper shadow' : 'text-sage'}`}>Create account</button>
              </div>

              {error && (
                <div ref={errorRef} tabIndex={-1} role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 outline-none focus:ring-4 focus:ring-red-100">
                  {error}
                </div>
              )}
              {info && <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-800">{info}</div>}

              {mode === 'login' ? (
                <form onSubmit={handleLogin} noValidate className="mt-5 grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" required autoComplete="username" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
                  </div>
                  <Button type="submit" loading={loading} className="w-full bg-safety hover:bg-[#E64400] text-white mt-1">
                    Sign in →
                  </Button>
                  <div className="grid grid-cols-2 gap-1.5 pt-2">
                    {[
                      { label: 'Admin', u: 'admin', p: 'admin123' },
                      { label: 'Resident', u: 'user1', p: 'user123' },
                      { label: 'Collector', u: 'collector1', p: 'collector123' },
                      { label: 'Recycler', u: 'recycler1', p: 'recycler123' },
                    ].map((d) => (
                      <button key={d.label} type="button" onClick={() => { setUsername(d.u); setPassword(d.p); }} className="rounded-xl border border-stone bg-paper px-2 py-2 text-xs font-semibold hover:bg-white hover:border-safety/30 transition-colors">
                        {d.label}
                      </button>
                    ))}
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister} noValidate className="mt-5 grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="r-username">Username</Label>
                    <Input id="r-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="r-email">Email</Label>
                    <Input id="r-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@city.gov" required />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="r-password">Password</Label>
                      <Input id="r-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="r-phone">Phone</Label>
                      <Input id="r-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
                    </div>
                  </div>
                  <p className="mono text-[11px] tracking-widest text-sage bg-paper rounded-xl border border-stone px-3 py-2">Only Resident accounts can be created here. Collectors, Recyclers and Admins are provisioned by an admin.</p>
                  <Button type="submit" loading={loading} className="w-full bg-safety hover:bg-[#E64400] text-white">
                    Create account →
                  </Button>
                </form>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 mono text-[11px] tracking-widest text-sage justify-center">
              <span className="h-px w-8 bg-stone" aria-hidden /> Encrypted in transit • Role-based access <span className="h-px w-8 bg-stone" aria-hidden />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-stone bg-ink text-paper p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg font-bold tracking-tight">Yard is open. Bring material.</p>
            <p className="text-sm text-paper/70">Every kilogram weighed and recovered counts.</p>
          </div>
          <a href="#auth" className="inline-flex h-11 items-center rounded-xl bg-paper px-6 text-sm font-bold text-ink hover:bg-white transition-colors">Sign in now →</a>
        </div>
      </main>

      <footer className="border-t border-stone bg-paper/60 py-4">
        <div className="mx-auto flex max-w-[1280px] flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-6 mono text-[11px] tracking-widest text-sage">
          <span>© 2026 RECLAIM MRF-01 • Civic Waste OS</span>
          <span className="flex items-center gap-2"><span className="h-1 w-6 bg-safety" aria-hidden /> Reclaim — Circular City</span>
        </div>
      </footer>
    </div>
  );
}
