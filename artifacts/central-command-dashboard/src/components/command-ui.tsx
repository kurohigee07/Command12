import { type HTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, Check, ChevronRight, Copy, Info, RefreshCw, X } from 'lucide-react';

export type StatusValue = 'online' | 'warning' | 'offline' | string;

export function formatRelativeTime(value?: string | null): string {
  if (!value) return 'No event';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const delta = Math.max(0, Date.now() - date.getTime());
  const seconds = Math.floor(delta / 1000);
  if (seconds < 15) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatTimestamp(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function StatusPill({ status, compact = false }: { status?: StatusValue; compact?: boolean }) {
  const normalized = status === 'warning' ? 'warning' : status === 'offline' ? 'offline' : 'online';
  return (
    <span className={`inline-flex items-center gap-2 ${compact ? 'text-[10px]' : 'text-xs'} font-medium uppercase tracking-[0.13em] status-text-${normalized}`} data-testid={`status-${normalized}`}>
      <span className={`status-dot status-dot-${normalized}`} />
      {normalized}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-mono-data text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = '', ...props }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return <div className={`cc-panel rounded-xl border border-card-border ${className}`} {...props}>{children}</div>;
}

export function LoadingRows({ count = 4, columns = 3 }: { count?: number; columns?: number }) {
  return (
    <div className="space-y-2" data-testid="loading-rows">
      {Array.from({ length: count }).map((_, index) => (
        <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-muted/20 px-4 py-4" key={index}>
          <div className="skeleton h-2.5 w-2.5 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton h-3 w-32 rounded" />
            <div className="skeleton h-2 w-48 rounded" />
          </div>
          {Array.from({ length: columns }).map((__, column) => <div className="skeleton hidden h-3 w-20 rounded sm:block" key={column} />)}
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message = 'Unable to load this view.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive/5 px-6 text-center" data-testid="state-error">
      <AlertCircle className="mb-3 h-5 w-5 text-destructive" />
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">The API did not return a valid response.</p>
      {onRetry && <button type="button" onClick={onRetry} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition hover:bg-muted" data-testid="button-retry"><RefreshCw className="h-3.5 w-3.5" /> Retry</button>}
    </div>
  );
}

export function EmptyState({
  title,
  detail,
  hint,
  action,
  icon = <Info className="h-5 w-5" />,
}: {
  title: string;
  detail: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 px-6 text-center" data-testid="state-empty">
      <div className="mb-3 rounded-lg border border-border bg-secondary p-2 text-muted-foreground">{icon}</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{detail}</p>
      {hint && <p className="mt-2 max-w-sm text-[11px] leading-5 text-muted-foreground/75">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function CopyButton({ value, onCopied }: { value: string; onCopied?: () => void }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      onCopied?.();
    } catch {
      // Clipboard access is optional in restricted browser contexts.
    }
  };
  return <button type="button" onClick={copy} className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Copy value" data-testid="button-copy-value"><Copy className="h-3.5 w-3.5" /></button>;
}

export function JsonBlock({ value }: { value: unknown }) {
  return <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-[hsl(240_8%_6%)] p-4 font-mono-data text-[11px] leading-5 text-[hsl(158_66%_68%)]">{JSON.stringify(value ?? {}, null, 2)}</pre>;
}

export function Modal({ open, title, detail, onClose, children }: { open: boolean; title: string; detail?: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(3,4,7,0.78)] p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" data-testid="modal-dialog">
      <div className="cc-panel cc-scanline max-h-[92dvh] w-full overflow-auto rounded-t-2xl border border-border sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Close dialog" data-testid="button-close-dialog"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ToastNotice({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-3 rounded-lg border border-primary/25 bg-card px-4 py-3 text-xs text-foreground shadow-2xl shadow-black/30" data-testid="status-toast">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary"><Check className="h-3 w-3" /></span>
      <span>{message}</span>
      {onClose && <button type="button" onClick={onClose} className="ml-2 text-muted-foreground hover:text-foreground" aria-label="Dismiss message" data-testid="button-dismiss-toast"><X className="h-3.5 w-3.5" /></button>}
    </div>
  );
}

export function ChevronLink({ children, href }: { children: ReactNode; href: string }) {
  return <a href={href} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-primary" data-testid={`link-${href.replace('/', '') || 'home'}`}>{children}<ChevronRight className="h-3.5 w-3.5" /></a>;
}