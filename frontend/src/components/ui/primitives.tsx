import * as React from 'react';
import { cn } from '../../lib/utils';

// Button — 44px min, focus ring, loading
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'icon';
  loading?: boolean;
};
export function Button({ variant = 'primary', size = 'default', loading, className, children, disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold tracking-tight transition-all focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none';
  const sizes = {
    default: 'h-11 px-5 text-sm rounded-xl',
    sm: 'h-9 px-3.5 text-xs rounded-xl',
    icon: 'h-11 w-11 rounded-xl',
  };
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow focus-visible:shadow-focus',
    secondary: 'bg-white border border-border text-foreground hover:bg-muted hover:border-border-strong shadow-sm',
    ghost: 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
    destructive: 'bg-error text-white hover:bg-red-700 shadow-sm',
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], 'cursor-pointer active:scale-[0.98]', className)} disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden />}
      {children}
    </button>
  );
}

// Input
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { error?: string }>(function Input({ className, error, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-xl border bg-white px-3.5 py-2 text-sm font-medium text-foreground placeholder:text-stone-400 shadow-sm outline-none transition-all hover:border-border-strong focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-muted disabled:text-muted-foreground',
        error ? 'border-error focus:border-error focus:ring-error/10' : 'border-input',
        className,
      )}
      aria-invalid={!!error}
      {...props}
    />
  );
});

// Textarea
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('flex min-h-[88px] w-full rounded-xl border border-input bg-white px-3.5 py-3 text-sm font-medium text-foreground placeholder:text-stone-400 shadow-sm outline-none transition-all hover:border-border-strong focus:border-primary focus:ring-4 focus:ring-primary/10', className)} {...props} />;
});

// Select
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn('flex h-11 w-full rounded-xl border border-input bg-white px-3.5 text-sm font-medium text-foreground shadow-sm outline-none transition-all hover:border-border-strong focus:border-primary focus:ring-4 focus:ring-primary/10', className)}
      {...props}
    >
      {children}
    </select>
  );
});

// Label
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-[11px] font-semibold uppercase tracking-widest text-sage-700', className)} {...props} />;
}

// Card
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card rounded-2xl p-5 sm:p-6', className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-start justify-between gap-3', className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-title font-bold tracking-tight text-foreground', className)} {...props} />;
}
export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1 text-sm leading-relaxed text-muted-foreground', className)} {...props} />;
}

// Badge
export function Badge({ tone = 'stone', className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: 'sage' | 'amber' | 'stone' | 'error' | 'info' }) {
  const tones = {
    sage: 'bg-success-muted text-sage-800 ring-1 ring-sage-200',
    amber: 'bg-warning-muted text-amber-800 ring-1 ring-amber-200',
    stone: 'bg-stone-100 text-stone-700 ring-1 ring-stone-200',
    error: 'bg-error-muted text-red-800 ring-1 ring-red-200',
    info: 'bg-info-muted text-blue-800 ring-1 ring-blue-200',
  };
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide', tones[tone], className)} {...props} />;
}

// Alert
export function Alert({ variant = 'info', className, ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'info' | 'success' | 'warning' | 'error' }) {
  const variants = {
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-red-200 bg-red-50 text-red-900',
  };
  return <div role="alert" className={cn('rounded-xl border px-4 py-3 text-sm font-medium', variants[variant], className)} {...props} />;
}

// Skeleton
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton h-4 w-full', className)} {...props} aria-hidden />;
}

// Empty & Error
export function EmptyState({ title, description, action, icon }: { title: string; description: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted p-8 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-border shadow-sm">{icon ?? <span className="h-2 w-2 rounded-full bg-stone-300" aria-hidden />}</div>
      <p className="mt-3 text-sm font-semibold tracking-tight text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-[36ch] text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm font-semibold text-red-800">Something went wrong</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

// Tabs
export function Tabs({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) {
  return <div>{React.Children.map(children, (child) => (React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<{ value: string; onValueChange: (v: string) => void }>, { value, onValueChange }) : child))}</div>;
}
export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" className={cn('inline-flex items-center gap-1 rounded-full bg-muted p-1', className)} {...props} />;
}
export function TabsTrigger({
  value: triggerValue,
  currentValue,
  onValueChange,
  children,
}: {
  value: string;
  currentValue?: string;
  onValueChange?: (v: string) => void;
  children: React.ReactNode;
  valueProp?: string;
}) {
  const active = currentValue === triggerValue;
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={() => onValueChange?.(triggerValue)}
      className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition-colors', active ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
    >
      {children}
    </button>
  );
}
// Simpler Tabs usage
export function SimpleTabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" className="inline-flex gap-1 rounded-full bg-muted p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={cn('rounded-full px-4 py-1.5 text-sm font-semibold transition-colors', active === t.id ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// Pagination
export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2 pt-4">
      <p className="text-xs font-medium text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="px-2 text-xs font-semibold tabular-nums">
          {page} / {totalPages}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}

// Breadcrumbs
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-stone-300" aria-hidden>/</span>}
          {item.href ? (
            <a href={item.href} className="font-medium text-muted-foreground hover:text-foreground">
              {item.label}
            </a>
          ) : (
            <span className="font-semibold text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// Modal — simple, accessible
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="card w-full max-w-lg rounded-3xl p-6 shadow-card animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="modal-title" className="text-lg font-bold tracking-tight">
            {title}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
