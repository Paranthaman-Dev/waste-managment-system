import * as React from 'react';
import { cn } from '../../utils';
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';

// ==========================================
// Button — enterprise density: 44px default, 12px radius
// ==========================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'subtle';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'default', loading, className, children, disabled, ...props },
  ref,
) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium tracking-tight transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-safety focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-40 disabled:pointer-events-none select-none cursor-pointer active:scale-[0.98]';

  const sizes = {
    default: 'h-11 px-5 text-sm font-semibold rounded-[12px]',
    sm: 'h-9 px-3 text-xs font-semibold rounded-[10px]',
    lg: 'h-12 px-6 text-sm font-semibold rounded-[12px]',
    icon: 'h-11 w-11 rounded-[12px]',
  };

  const variants = {
    primary: 'bg-safety text-white hover:bg-[#e64400] shadow-soft',
    secondary:
      'bg-surface-muted text-foreground hover:bg-stone border border-border shadow-soft',
    outline: 'border border-border bg-surface text-foreground hover:bg-surface-muted hover:border-border-strong',
    ghost: 'bg-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground',
    destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-soft',
    subtle: 'bg-primary-muted text-[#c73a00] hover:bg-[#ffe7da]',
  };

  return (
    <button
      ref={ref}
      className={cn(base, sizes[size], variants[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin text-current" aria-hidden />}
      {children}
    </button>
  );
});

// ==========================================
// Input
// ==========================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, leftIcon, rightIcon, ...props },
  ref,
) {
  return (
    <div className="relative w-full">
      {leftIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {leftIcon}
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-[12px] border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted-foreground shadow-soft outline-none transition-all duration-150 hover:border-border-strong focus:border-safety focus:ring-2 focus:ring-safety/20 disabled:bg-surface-muted disabled:text-muted-foreground',
          leftIcon ? 'pl-10' : undefined,
          rightIcon ? 'pr-10' : undefined,
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-border',
          className,
        )}
        aria-invalid={!!error}
        {...props}
      />
      {rightIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{rightIcon}</div>
      )}
    </div>
  );
});

// ==========================================
// Textarea
// ==========================================
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[88px] w-full rounded-[12px] border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-soft outline-none transition-all duration-150 hover:border-border-strong focus:border-safety focus:ring-2 focus:ring-safety/20 disabled:bg-surface-muted disabled:text-muted-foreground',
          className,
        )}
        {...props}
      />
    );
  },
);

// ==========================================
// Select
// ==========================================
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-[12px] border border-border bg-surface px-3 text-sm text-foreground shadow-soft outline-none transition-all duration-150 hover:border-border-strong focus:border-safety focus:ring-2 focus:ring-safety/20 disabled:bg-surface-muted disabled:text-muted-foreground',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

// ==========================================
// Label
// ==========================================
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-xs font-semibold text-muted-foreground select-none', className)}
      {...props}
    />
  );
}

// ==========================================
// Card — 12px radius, white surface
// ==========================================
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('wm-card p-5', className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-start justify-between gap-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-[15px] font-bold tracking-tight text-foreground', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-0.5 text-[13px] text-muted-foreground leading-relaxed', className)} {...props} />;
}

// ==========================================
// Badge
// ==========================================
export function Badge({
  tone = 'neutral',
  dot = false,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'sage' | 'amber' | 'stone' | 'error' | 'info' | 'neutral' | 'success';
  dot?: boolean;
}) {
  const tones = {
    sage: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80',
    stone: 'bg-stone text-[#4a4f4b] border-kraft/40',
    neutral: 'bg-stone text-[#4a4f4b] border-kraft/40',
    error: 'bg-red-50 text-red-700 border-red-200/80',
    info: 'bg-blue-50 text-blue-700 border-blue-200/80',
  };

  const dotTones = {
    sage: 'bg-emerald-500',
    success: 'bg-emerald-500',
    amber: 'bg-amber-500',
    stone: 'bg-kraft',
    neutral: 'bg-kraft',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight',
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotTones[tone])} aria-hidden />}
      {children}
    </span>
  );
}

// ==========================================
// Stat Card / KPI
// ==========================================
export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive?: boolean };
  className?: string;
}) {
  return (
    <div className={cn('wm-card p-5 relative overflow-hidden group hover:border-border-strong transition-all', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
          <h4 className="mt-1 text-3xl font-bold tracking-tight text-foreground font-mono">{value}</h4>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>}
        </div>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-surface-muted text-foreground border border-border">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center text-xs font-semibold',
              trend.positive ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
          <span className="text-[11px] text-muted-foreground">vs previous</span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Progress Bar
// ==========================================
export function ProgressBar({
  value,
  max = 100,
  className,
  color = 'bg-safety',
}: {
  value: number;
  max?: number;
  className?: string;
  color?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-muted border border-border/40', className)}>
      <div className={cn('h-full transition-all duration-500 rounded-full', color)} style={{ width: `${percentage}%` }} />
    </div>
  );
}

// ==========================================
// Alert
// ==========================================
export function Alert({
  variant = 'info',
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: 'info' | 'success' | 'warning' | 'error' }) {
  const variants = {
    info: 'border-blue-500/20 bg-blue-50/50 text-blue-900',
    success: 'border-emerald-500/20 bg-emerald-50/50 text-emerald-900',
    warning: 'border-amber-500/20 bg-amber-50/50 text-amber-900',
    error: 'border-red-500/20 bg-red-50/50 text-red-900',
  };
  return (
    <div
      role="alert"
      className={cn('rounded-[12px] border p-3.5 text-[13px] font-medium flex items-start gap-2.5', variants[variant], className)}
      {...props}
    >
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 opacity-80" />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ==========================================
// Empty & Error States
// ==========================================
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-dashed border-border bg-surface-muted/40 p-8 text-center animate-fade-in">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[12px] bg-surface border border-border shadow-soft text-muted-foreground">
        {icon ?? <span className="h-2 w-2 rounded-full bg-kraft" aria-hidden />}
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground tracking-tight">{title}</p>
      <p className="mx-auto mt-1 max-w-[40ch] text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-[12px] border border-red-200 bg-red-50/40 p-5 text-center">
      <p className="text-sm font-semibold text-red-800">Something went wrong</p>
      <p className="mt-0.5 text-[13px] text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

// ==========================================
// SimpleTabs / Segmented
// ==========================================
export function SimpleTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: string; label: string; count?: number; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('inline-flex flex-wrap gap-1 rounded-[12px] bg-surface-muted p-1 border border-border/60', className)}>
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-all duration-150 select-none cursor-pointer',
              isActive ? 'bg-surface text-foreground shadow-soft border border-border/80' : 'text-muted-foreground hover:text-foreground hover:bg-surface/50',
            )}
          >
            {t.icon && <span className="h-3.5 w-3.5">{t.icon}</span>}
            {t.label}
            {t.count !== undefined && (
              <span
                className={
                  'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ' +
                  (isActive ? 'bg-primary-muted text-[#c73a00]' : 'bg-stone text-sage')
                }
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ==========================================
// Pagination — Previous / Next
// ==========================================
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2 pt-4 border-t border-border mt-3">
      <p className="text-[13px] font-medium text-muted-foreground">
        Page <span className="font-semibold text-foreground">{page}</span> of{' '}
        <span className="font-semibold text-foreground">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}

// ==========================================
// Switch
// ==========================================
export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-safety',
          checked ? 'bg-safety' : 'bg-kraft',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-soft transition duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}
    </label>
  );
}

// ==========================================
// Modal
// ==========================================
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn('wm-card w-full rounded-[16px] p-6 shadow-xl animate-scale-in border border-border', maxWidth)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClose} aria-label="Close modal">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
