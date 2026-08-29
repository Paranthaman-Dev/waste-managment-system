import { FormEvent, useState, useRef } from 'react';
import { useAuth } from '../../lib/auth';
import { Button, Input, Label, Alert } from '../../components/ui/primitives';
import { apiRequest } from '../../lib/api';

export function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
      await apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password, phone: phone || undefined, role }) });
      setInfo('Account created — you can now sign in.');
      setMode('login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setTimeout(() => errorRef.current?.focus(), 30);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">♻</div>
            <span className="text-[15px] font-bold tracking-tight">Reclaim</span>
            <span className="hidden sm:inline rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">OPERATIONS</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="#features" className="hidden md:inline-flex h-9 items-center px-3 text-sm font-medium text-muted-foreground hover:text-foreground">
              Features
            </a>
            <button onClick={() => setMode('register')} className="hidden sm:inline-flex h-9 items-center rounded-full border border-border bg-white px-4 text-sm font-semibold hover:bg-muted">
              Create account
            </button>
            <a href="#auth" className="inline-flex h-9 items-center rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">
              Sign in
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" aria-hidden />
            Live operations • Paper • Forest • Terracotta
          </div>
          <h1 className="mt-4 font-display text-hero text-foreground">
            Waste operations, <span className="font-normal text-muted-foreground">made clear.</span>
          </h1>
          <p className="mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">A calm, editorial system for cities. Request pickups, run routes, and close the loop — without the chrome.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#auth" className="inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-hover">
              Start with admin →
            </a>
            <a href="#features" className="inline-flex h-11 items-center rounded-xl border border-border bg-white px-6 text-sm font-semibold hover:bg-muted">
              See how it works
            </a>
          </div>

          <div id="features" className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { title: 'Request in 30s', desc: 'Type, weight, location. No extra steps.' },
              { title: 'Route, not chaos', desc: 'Collectors see queue → route → collected.' },
              { title: 'Proof, not promises', desc: 'Recyclers attach photo proof. Audited.' },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-surface p-4">
                <p className="text-sm font-bold">{f.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="auth" className="scroll-mt-20">
          <div className="card rounded-[24px] p-6 sm:p-7">
            <div className="flex items-center gap-1 rounded-full bg-muted p-1">
              <button onClick={() => setMode('login')} className={`flex-1 rounded-full py-2 text-sm font-semibold ${mode === 'login' ? 'bg-primary text-white shadow' : 'text-muted-foreground'}`}>
                Sign in
              </button>
              <button onClick={() => setMode('register')} className={`flex-1 rounded-full py-2 text-sm font-semibold ${mode === 'register' ? 'bg-primary text-white shadow' : 'text-muted-foreground'}`}>
                Create account
              </button>
            </div>

            {error && (
              <div ref={errorRef} tabIndex={-1} role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 outline-none focus:ring-4 focus:ring-red-100">
                {error}
              </div>
            )}
            {info && <Alert variant="success" className="mt-4">{info}</Alert>}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} noValidate className="mt-6 grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" required autoComplete="username" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
                </div>
                <Button type="submit" loading={loading} className="w-full">
                  Sign in →
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Admin', u: 'admin', p: 'admin123' },
                    { label: 'Resident', u: 'user1', p: 'user123' },
                    { label: 'Collector', u: 'collector1', p: 'collector123' },
                    { label: 'Recycler', u: 'recycler1', p: 'recycler123' },
                  ].map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => {
                        setUsername(d.u);
                        setPassword(d.p);
                      }}
                      className="rounded-xl border border-border bg-muted px-3 py-2.5 text-xs font-semibold hover:bg-white"
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground">Demo accounts prefilled after seed • 44px touch</p>
              </form>
            ) : (
              <form onSubmit={handleRegister} noValidate className="mt-6 grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="r-username">Username</Label>
                  <Input id="r-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="r-email">Email</Label>
                  <Input id="r-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@city.gov" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="r-password">Password</Label>
                    <Input id="r-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="r-phone">Phone (optional)</Label>
                    <Input id="r-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="r-role">Role</Label>
                  <select id="r-role" value={role} onChange={(e) => setRole(e.target.value)} className="flex h-11 w-full rounded-xl border border-input bg-white px-3.5 text-sm font-medium">
                    <option value="user">Resident</option>
                    <option value="collector">Collector</option>
                    <option value="recycler">Recycler</option>
                  </select>
                </div>
                <Button type="submit" loading={loading} className="w-full">
                  Create account →
                </Button>
              </form>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">Enterprise security • Argon2 • JWT rotation • 5/min limit</p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 pb-10 sm:px-6">
        <div className="rounded-3xl bg-foreground p-6 text-white sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">Ready to run the loop?</h2>
              <p className="mt-1 text-sm text-white/70">Four roles, one paper. No demo data — real Postgres.</p>
            </div>
            <a href="#auth" className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-foreground hover:bg-stone-100">
              Sign in now →
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-surface/60">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 px-4 py-6 text-xs sm:flex-row sm:px-6">
          <span className="text-muted-foreground">© 2026 Reclaim • Paper #FDFCF9 • Forest #3A5A40 • Terracotta #C2704A</span>
          <span className="text-muted-foreground">Inter + Fraunces • 375 → 1440 • CLS &lt;0.1</span>
        </div>
      </footer>
    </div>
  );
}
