import { type FormEvent, type ReactNode, useState } from 'react';
import { Activity, Boxes, Command, Cpu, Menu, Radio, Send, Settings2, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useHealthCheck, useIngestTelemetry } from '@workspace/api-client-react';
import { Modal, ToastNotice } from '@/components/command-ui';

const navigation = [
  { href: '/', label: 'Overview', icon: Command },
  { href: '/systems', label: 'Nodes', icon: Boxes },
  { href: '/logs', label: 'Events', icon: Activity },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [toast, setToast] = useState('');
  const health = useHealthCheck();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-[hsl(240_8%_5%/0.92)] px-4 backdrop-blur-xl lg:hidden">
        <Link href="/" className="flex items-center gap-3" data-testid="link-mobile-logo" onClick={() => setMobileOpen(false)}>
          <BrandMark />
          <span className="font-mono-data text-xs font-medium tracking-[0.12em] text-foreground">CENTRAL COMMAND</span>
        </Link>
        <button type="button" onClick={() => setMobileOpen((value) => !value)} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground" aria-label="Toggle navigation" data-testid="button-toggle-navigation">{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </header>

      <aside className={`fixed inset-y-0 left-0 z-50 w-[252px] border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6">
            <BrandMark />
            <div>
              <p className="font-mono-data text-xs font-medium tracking-[0.12em] text-sidebar-foreground">CENTRAL COMMAND</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Automation console</p>
            </div>
          </div>
          <div className="px-4 pt-7">
            <p className="px-3 font-mono-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
            <nav className="mt-3 space-y-1" aria-label="Primary navigation">
              {navigation.map(({ href, label, icon: Icon }) => {
                const active = location === href;
                return (
                  <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_hsl(var(--primary))]' : 'text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
                    <Icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    <span>{label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="mt-auto px-4 pb-5">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-muted-foreground">API</p>
                <Radio className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="mt-3 text-sm font-medium text-sidebar-accent-foreground">Events and status.</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Telemetry stored locally.</p>
            </div>
            <div className="mt-4 flex items-center gap-3 px-2 text-xs text-muted-foreground">
              <Settings2 className="h-3.5 w-3.5" />
              <span>Local</span>
              <span className="ml-auto font-mono-data text-[10px]">v0.4.1</span>
            </div>
          </div>
        </div>
      </aside>
      {mobileOpen && <button type="button" className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-navigation-overlay" />}

      <main className="min-h-[100dvh] pt-16 lg:pl-[252px] lg:pt-0">
        <div className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <TopBar health={health.data?.status} onTransmit={() => setTelemetryOpen(true)} />
          <div className="mt-8">{children}</div>
        </div>
      </main>
      <TelemetryDialog open={telemetryOpen} onClose={() => setTelemetryOpen(false)} onSuccess={(message) => { setTelemetryOpen(false); setToast(message); }} />
      {toast && <ToastNotice message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

function BrandMark() {
  return <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Cpu className="h-4 w-4" /><span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-accent" /></div>;
}

function TopBar({ health, onTransmit }: { health?: string; onTransmit: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
      <div>
        <p className="font-mono-data text-[10px] uppercase tracking-[0.24em] text-muted-foreground">Runtime / local environment</p>
        <p className="mt-2 text-sm text-muted-foreground">Monitor nodes and events.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground sm:flex" data-testid="status-health">
          <span className={`status-dot ${health === 'ok' || health === 'healthy' ? 'status-dot-online' : health ? 'status-dot-warning' : 'status-dot-offline'}`} />
          {health ? 'API online' : 'Checking API'}
        </div>
        <button type="button" onClick={onTransmit} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[0.98]" data-testid="button-open-telemetry">
          <Send className="h-3.5 w-3.5" /> Send event
        </button>
      </div>
    </div>
  );
}

function TelemetryDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: (message: string) => void }) {
  const [systemName, setSystemName] = useState('');
  const [status, setStatus] = useState<'online' | 'warning' | 'offline'>('online');
  const [eventType, setEventType] = useState('heartbeat');
  const [message, setMessage] = useState('');
  const [apiKey, setApiKey] = useState(() => window.localStorage.getItem('central-command-api-key') ?? '');
  const [error, setError] = useState('');
  const mutation = useIngestTelemetry({ request: { headers: { 'X-API-KEY': apiKey } } });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!systemName.trim() || !eventType.trim()) {
      setError('Node name and event type are required.');
      return;
    }
    setError('');
    window.localStorage.setItem('central-command-api-key', apiKey);
    mutation.mutate({ data: { system_name: systemName.trim(), status, event_type: eventType.trim(), message: message.trim() || undefined } }, {
      onSuccess: (result) => onSuccess(`${result.system.name} accepted the ${result.log.event_type} event.`),
      onError: () => setError('Event rejected. Check the API key and payload.'),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Send event" detail="Post an event to the local API.">
      <form onSubmit={submit} className="space-y-4 p-5">
        <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">Node name</span><input value={systemName} onChange={(event) => setSystemName(event.target.value)} placeholder="e.g. render-worker-01" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-mono-data text-xs text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="input-telemetry-system" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">Node state</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary" data-testid="select-telemetry-status"><option value="online">Online</option><option value="warning">Warning</option><option value="offline">Offline</option></select></label>
          <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">Event type</span><input value={eventType} onChange={(event) => setEventType(event.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-mono-data text-xs text-foreground outline-none focus:border-primary" data-testid="input-telemetry-event" /></label>
        </div>
        <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">Message <span className="font-normal text-muted-foreground/70">(optional)</span></span><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={3} placeholder="Optional event details..." className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary" data-testid="input-telemetry-message" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">API key</span><input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Stored in this browser only" className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-mono-data text-xs text-foreground outline-none focus:border-primary" data-testid="input-telemetry-api-key" /></label>
        {error && <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs text-destructive" data-testid="status-telemetry-error">{error}</p>}
        <button disabled={mutation.isPending} type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-submit-telemetry">{mutation.isPending ? 'Sending…' : 'Send event'}</button>
      </form>
    </Modal>
  );
}