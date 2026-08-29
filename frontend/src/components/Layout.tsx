import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, role, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#f6f4ed]">
      <header className="border-b border-earth/10 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-leaf">Waste Ops</p>
            <h1 className="text-2xl font-bold text-earth">Role-based Waste Management</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-earth">
              {user?.username ?? 'Guest'} {role ? `(${role})` : ''}
            </span>
            {user && (
              <button className="rounded-full bg-earth px-4 py-2 text-sm font-semibold text-white hover:bg-earth/90" onClick={logout}>
                Logout
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-earth/10 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-bold text-earth">{title}</h2>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-earth">
      {label}
      {children}
    </label>
  );
}

export const inputClass = 'min-h-11 rounded-xl border border-earth/20 bg-white px-3 py-2 text-base font-normal text-earth';
export const buttonClass = 'min-h-11 rounded-xl bg-leaf px-4 py-2 font-bold text-white hover:bg-leaf/90 disabled:opacity-50';
