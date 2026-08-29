import { FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { buttonClass, inputClass } from '../components/Layout';

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
    <div className="grid min-h-screen place-items-center bg-earth px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-[2rem] bg-[#f6f4ed] p-8 shadow-2xl">
        <p className="text-sm uppercase tracking-[0.25em] text-leaf">Waste Ops</p>
        <h1 className="mt-2 text-3xl font-black text-earth">Sign in</h1>
        <p className="mt-2 text-earth/70">Use username and password only. Demo admin is prefilled after seeding.</p>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-1 font-semibold text-earth">
            Username
            <input className={inputClass} value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label className="grid gap-1 font-semibold text-earth">
            Password
            <input className={inputClass} value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          {error && <p className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}
          <button className={buttonClass} disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </div>
      </form>
    </div>
  );
}
