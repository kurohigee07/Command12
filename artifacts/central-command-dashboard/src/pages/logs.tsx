import { useMemo, useState } from 'react';
import { Activity, Braces, CalendarClock, Filter, Search, TerminalSquare, X } from 'lucide-react';
import { useListSystemLogs, useListSystems } from '@workspace/api-client-react';
import { EmptyState, ErrorState, formatRelativeTime, formatTimestamp, JsonBlock, LoadingRows, Modal, Panel, SectionHeading } from '@/components/command-ui';

export default function Logs() {
  const [systemName, setSystemName] = useState('');
  const [eventQuery, setEventQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const logs = useListSystemLogs({ limit: 100, system_name: systemName || undefined });
  const systems = useListSystems();
  const filtered = useMemo(() => (logs.data ?? []).filter((log) => `${log.event_type} ${log.message ?? ''} ${log.system_name}`.toLowerCase().includes(eventQuery.toLowerCase())), [logs.data, eventQuery]);
  const selected = (logs.data ?? []).find((log) => log.id === selectedId);

  return (
    <div className="animate-rise">
      <SectionHeading eyebrow="Events / history" title="Events" detail="Accepted events, newest first." action={<div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 font-mono-data text-[10px] text-muted-foreground"><TerminalSquare className="h-3.5 w-3.5 text-primary" /> {logs.data?.length ?? '—'} events loaded</div>} />
      <Panel className="cc-scanline overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center">
          <label className="relative block flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={eventQuery} onChange={(event) => setEventQuery(event.target.value)} placeholder="Search events, messages, or systems" className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-9 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15" data-testid="input-search-logs" />{eventQuery && <button type="button" onClick={() => setEventQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear log search" data-testid="button-clear-log-search"><X className="h-4 w-4" /></button>}</label>
           <div className="relative flex items-center gap-2"><Filter className="h-4 w-4 shrink-0 text-muted-foreground" /><select value={systemName} onChange={(event) => setSystemName(event.target.value)} className="min-w-[190px] rounded-lg border border-input bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary" data-testid="select-log-system"><option value="">All nodes</option>{(systems.data ?? []).map((system) => <option value={system.name} key={system.id}>{system.name}</option>)}</select></div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5 font-mono-data text-[10px] text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" /> Latest 100</div>
        </div>
         <div className="flex items-center justify-between border-b border-border bg-muted/10 px-4 py-3 text-xs text-muted-foreground sm:px-5"><span>{filtered.length} visible events</span><span className="font-mono-data text-[10px] uppercase tracking-[0.13em]">Inspect payload for details</span></div>
          {logs.isLoading ? <div className="p-4 sm:p-5"><LoadingRows count={8} columns={2} /></div> : logs.isError ? <div className="p-4 sm:p-5"><ErrorState message="Event history unavailable." onRetry={() => void logs.refetch()} /></div> : filtered.length === 0 ? <div className="p-4 sm:p-5"><EmptyState title="No events in this view" detail={systemName || eventQuery ? 'Clear a filter to widen the event list.' : 'Accepted events will be recorded here.'} hint="Try adjusting the filters above." icon={<Activity className="h-5 w-5" />} /></div> : (
          <div className="divide-y divide-border/70">
            {filtered.map((log) => <div className="group flex flex-col gap-3 px-4 py-4 transition hover:bg-primary/[0.035] sm:flex-row sm:items-center sm:px-5" key={log.id} data-testid={`row-log-${log.id}`}>
               <div className="flex min-w-0 flex-1 items-start gap-3"><div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-primary"><Activity className="h-3.5 w-3.5" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono-data text-xs font-medium text-foreground">{log.event_type}</span><span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono-data text-[9px] text-muted-foreground">{log.system_name}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{log.message || 'No message'}</p><p className="mt-2 font-mono-data text-[10px] text-muted-foreground/70">{log.id}</p></div></div>
              <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end"><div className="text-left sm:text-right"><p className="text-xs text-foreground">{formatRelativeTime(log.created_at)}</p><p className="mt-1 font-mono-data text-[10px] text-muted-foreground">{formatTimestamp(log.created_at)}</p></div><button type="button" onClick={() => setSelectedId(log.id)} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition hover:border-primary/40 hover:text-primary" data-testid={`button-inspect-log-${log.id}`}><Braces className="h-3.5 w-3.5" /> Inspect</button></div>
            </div>)}
          </div>
        )}
      </Panel>
      <Modal open={Boolean(selected)} onClose={() => setSelectedId(null)} title={selected?.event_type ?? 'Event payload'} detail={selected ? `${selected.system_name} · ${formatTimestamp(selected.created_at)}` : undefined}>
        {selected && <div className="space-y-5 p-5"><div className="rounded-lg border border-border bg-secondary/60 p-4"><p className="text-sm leading-6 text-foreground">{selected.message || 'No message for this event.'}</p><div className="mt-3 flex items-center gap-2 font-mono-data text-[10px] text-muted-foreground"><span>{selected.id}</span><span className="text-border">/</span><span>{selected.system_name}</span></div></div><div><p className="mb-2 flex items-center gap-2 font-mono-data text-[10px] uppercase tracking-[0.18em] text-muted-foreground"><Braces className="h-3.5 w-3.5" /> Payload</p><JsonBlock value={selected.payload} /></div></div>}
      </Modal>
    </div>
  );
}