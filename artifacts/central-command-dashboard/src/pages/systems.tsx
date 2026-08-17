import { type ReactNode, useMemo, useState } from 'react';
import { CheckCircle2, Clipboard, Database, Globe2, Radio, Search, Server, SlidersHorizontal, Tag, XCircle, Zap } from 'lucide-react';
import { useListSystems } from '@workspace/api-client-react';
import { EmptyState, ErrorState, formatRelativeTime, formatTimestamp, LoadingRows, Modal, Panel, SectionHeading, StatusPill, JsonBlock, CopyButton } from '@/components/command-ui';

type FilterState = 'all' | 'online' | 'warning' | 'offline';

export default function Systems() {
  const systems = useListSystems();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterState>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHeartbeatGuide, setShowHeartbeatGuide] = useState(false);
  const filtered = useMemo(() => {
    const rows = systems.data ?? [];
    return rows.filter((system) => {
      const matchesSearch = `${system.name} ${system.id}`.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || system.derived_status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [systems.data, search, filter]);
  const selected = (systems.data ?? []).find((system) => system.id === selectedId);

  return (
    <div className="animate-rise">
      <SectionHeading eyebrow="Inventory / monitored nodes" title="Nodes" detail="Workers and integrations reporting to the API." action={<div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 font-mono-data text-[10px] text-muted-foreground"><Server className="h-3.5 w-3.5 text-primary" /> {systems.data?.length ?? '—'} registered</div>} />
      <Panel className="cc-scanline overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block max-w-xl flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by system name or ID" className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-9 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="input-search-systems" />{search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear system search" data-testid="button-clear-system-search"><XCircle className="h-4 w-4" /></button>}</label>
            <div className="flex items-center gap-1.5 overflow-x-auto rounded-lg border border-border bg-secondary p-1" role="group" aria-label="Filter systems by status" data-testid="group-system-filters">
              <SlidersHorizontal className="mx-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {(['all', 'online', 'warning', 'offline'] as FilterState[]).map((value) => <button type="button" key={value} onClick={() => setFilter(value)} className={`rounded-md px-3 py-1.5 font-mono-data text-[10px] uppercase tracking-[0.12em] transition ${filter === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} data-testid={`button-filter-${value}`}>{value}</button>)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{filtered.length} matching {filtered.length === 1 ? 'node' : 'nodes'}</span><span className="font-mono-data text-[10px] uppercase tracking-[0.13em]">Derived status · 90s window</span></div>
        </div>

        {systems.isLoading ? <div className="p-4 sm:p-5"><LoadingRows count={6} columns={3} /></div> : systems.isError ? <div className="p-4 sm:p-5"><ErrorState message="Node inventory unavailable." onRetry={() => void systems.refetch()} /></div> : filtered.length === 0 ? <div className="p-4 sm:p-5"><EmptyState title={search || filter !== 'all' ? 'No nodes match that view' : 'No nodes registered'} detail={search || filter !== 'all' ? 'Try another name or clear the status filter.' : 'Send a heartbeat to register a node.'} hint={!search && filter === 'all' ? 'The first heartbeat creates the node record automatically.' : undefined} action={!search && filter === 'all' ? <button type="button" onClick={() => setShowHeartbeatGuide(true)} className="inline-flex items-center gap-2 rounded-md border border-primary/35 bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition hover:border-primary/60 hover:bg-primary/15" data-testid="button-send-heartbeat"><Radio className="h-3.5 w-3.5" /> Send heartbeat</button> : undefined} icon={<Search className="h-5 w-5" />} /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead><tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-[0.16em] text-muted-foreground"><th className="px-5 py-3.5 font-medium">System</th><th className="px-5 py-3.5 font-medium">State</th><th className="px-5 py-3.5 font-medium">Last ping</th><th className="px-5 py-3.5 font-medium">Metadata</th><th className="px-5 py-3.5 font-medium text-right">Inspect</th></tr></thead>
              <tbody className="divide-y divide-border/70">
                {filtered.map((system) => <tr key={system.id} className="group transition hover:bg-primary/[0.035]" data-testid={`row-system-${system.id}`}>
                  <td className="px-5 py-4"><div className="flex items-center gap-3"><div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${system.derived_status === 'online' ? 'border-primary/20 bg-primary/10 text-primary' : system.derived_status === 'warning' ? 'border-accent/20 bg-accent/10 text-accent' : 'border-destructive/20 bg-destructive/10 text-destructive'}`}><Server className="h-4 w-4" /></div><div><p className="text-sm font-medium text-foreground">{system.name}</p><p className="mt-1 font-mono-data text-[10px] text-muted-foreground">{system.id}</p></div></div></td>
                  <td className="px-5 py-4"><StatusPill status={system.derived_status} /></td>
                  <td className="px-5 py-4"><p className="text-xs text-foreground">{formatRelativeTime(system.last_ping)}</p><p className="mt-1 font-mono-data text-[10px] text-muted-foreground">{formatTimestamp(system.last_ping)}</p></td>
                  <td className="px-5 py-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Tag className="h-3.5 w-3.5" /> {Object.keys(system.metadata ?? {}).length} fields</div></td>
                  <td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelectedId(system.id)} className="rounded-md border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition hover:border-primary/40 hover:text-primary" data-testid={`button-inspect-system-${system.id}`}>Inspect</button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <MiniNote icon={<CheckCircle2 className="h-4 w-4 text-primary" />} title="Derived from events" detail="Status uses the latest accepted heartbeat." />
        <MiniNote icon={<Zap className="h-4 w-4 text-accent" />} title="Single write path" detail="Events update node status and history together." />
        <MiniNote icon={<Database className="h-4 w-4 text-[hsl(193_80%_65%)]" />} title="Local data" detail="Inventory and payloads stay inside this deployment." />
      </div>
      <Modal open={Boolean(selected)} onClose={() => setSelectedId(null)} title={selected?.name ?? 'System details'} detail={selected ? `Registered ${formatTimestamp(selected.created_at)}` : undefined}>
        {selected && <div className="space-y-5 p-5"><div className="flex items-center justify-between rounded-lg border border-border bg-secondary/70 p-4"><div><p className="font-mono-data text-xs text-muted-foreground">{selected.id}</p><p className="mt-2 text-xs text-muted-foreground">Last event {formatRelativeTime(selected.last_ping)}</p></div><StatusPill status={selected.derived_status} /></div><div className="grid gap-3 sm:grid-cols-2"><Detail icon={<Globe2 className="h-3.5 w-3.5" />} label="Reported status" value={selected.status} /><Detail icon={<Server className="h-3.5 w-3.5" />} label="Derived status" value={selected.derived_status} /></div><div><p className="mb-2 font-mono-data text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Metadata</p><JsonBlock value={selected.metadata} /></div></div>}
      </Modal>
      <Modal open={showHeartbeatGuide} onClose={() => setShowHeartbeatGuide(false)} title="Bring a node online" detail="The first accepted heartbeat creates the node record automatically.">
        <div className="space-y-4 p-5">
          <p className="text-sm leading-6 text-muted-foreground">Send this from the worker you want to monitor. Replace the placeholder values, then come back here—the list refreshes on reload.</p>
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg border border-border bg-[hsl(240_8%_6%)] p-4 pr-12 font-mono-data text-[11px] leading-5 text-[hsl(158_66%_68%)]">{`curl -X POST /api/telemetry \\
  -H "X-API-KEY: <your-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"system_name":"worker-01","status":"online","event_type":"heartbeat"}'`}</pre>
            <div className="absolute right-2 top-2"><CopyButton value={`curl -X POST /api/telemetry -H "X-API-KEY: <your-key>" -H "Content-Type: application/json" -d '{"system_name":"worker-01","status":"online","event_type":"heartbeat"}'`} /></div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs leading-5 text-muted-foreground"><Clipboard className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />A small, explicit heartbeat is all this dashboard needs to start keeping watch.</div>
        </div>
      </Modal>
    </div>
  );
}

function MiniNote({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className="flex gap-3 rounded-xl border border-border bg-card/50 p-4"><div className="mt-0.5">{icon}</div><div><p className="text-xs font-medium">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div></div>;
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-secondary/50 p-3"><div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="font-mono-data text-[10px] uppercase tracking-[0.12em]">{label}</span></div><p className="mt-2 font-mono-data text-xs text-foreground">{value}</p></div>;
}