import { type ReactNode } from 'react';
import { Activity, ArrowUpRight, BarChart3, Clock3, RadioTower, Server, TriangleAlert, WifiOff } from 'lucide-react';
import { useGetDashboardSummary, useListSystemLogs, useListSystems } from '@workspace/api-client-react';
import { ChevronLink, EmptyState, ErrorState, formatRelativeTime, formatTimestamp, LoadingRows, Panel, StatusPill } from '@/components/command-ui';
import { TelegramWidget } from '@/components/widgets/TelegramWidget';

export function TelemetryHealthTab() {
  const summary = useGetDashboardSummary();
  const systems = useListSystems();
  const logs = useListSystemLogs({ limit: 12 });
  const loading = summary.isLoading || systems.isLoading || logs.isLoading;
  const error = summary.isError || systems.isError || logs.isError;
  const data = summary.data;
  const systemRows = systems.data ?? [];
  const logRows = logs.data ?? [];

  return (
    <section className="mt-8" aria-label="Telemetry workspace">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-zinc-500">Workspace / observability</p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-100">Telemetry</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 font-mono-data text-[10px] uppercase tracking-[0.15em] text-primary">
          <RadioTower className="h-3.5 w-3.5" /> Polling active
        </div>
      </div>

      {loading ? <OverviewSkeleton /> : error ? <div className="mt-8"><ErrorState message="Command summary is temporarily unavailable." onRetry={() => { void summary.refetch(); void systems.refetch(); void logs.refetch(); }} /></div> : (
        <>
          <section className="telemetry-overview mt-6" aria-label="Node status summary">
            <div className="telemetry-lead">
              <div>
                <p className="font-mono-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Cluster Health</p>
                <p className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-foreground" data-testid="metric-total-systems">{data?.total_systems ?? systemRows.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">registered systems</p>
              </div>
              <div className="telemetry-lead-meta">
                <BarChart3 className="h-4 w-4 text-primary" />
                <div>
                  <p className="font-mono-data text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Events / 24h</p>
                  <p className="mt-1 font-mono-data text-lg text-primary" data-testid="metric-events-/-24h">{data?.events_last_24h ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="telemetry-status-grid">
               <MetricCard label="Online" value={data?.online_systems ?? 0} detail="reachable" icon={<span className="status-dot status-dot-online" />} accent="online" />
               <MetricCard label="Needs attention" value={data?.warning_systems ?? 0} detail="degraded" icon={<TriangleAlert className="h-4 w-4" />} accent="warning" />
               <MetricCard label="Offline" value={data?.offline_systems ?? 0} detail="no recent event" icon={<WifiOff className="h-4 w-4" />} accent="offline" />
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
            <Panel className="animate-rise animate-rise-delay-1 overflow-hidden">
              <div className="flex items-start justify-between border-b border-border px-5 py-5">
                <div><p className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Node distribution</p><h2 className="mt-1 text-base font-semibold">Node status</h2><p className="mt-1 text-xs text-muted-foreground">Current status from reported events</p></div>
                 <div className="flex items-center gap-1.5 font-mono-data text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><Clock3 className="h-3 w-3" /> Updated now</div>
              </div>
              <div className="space-y-5 px-5 pb-5 pt-6">
                <div className="telemetry-rail" aria-label="Fleet status distribution" data-testid="chart-activity-volume">
                  {[
                    { label: 'Online', value: data?.online_systems ?? 0, tone: 'online' },
                    { label: 'Attention', value: data?.warning_systems ?? 0, tone: 'warning' },
                    { label: 'Offline', value: data?.offline_systems ?? 0, tone: 'offline' },
                  ].filter((item) => item.value > 0).map((item) => (
                    <div className={`telemetry-rail-segment telemetry-rail-${item.tone}`} key={item.label} style={{ flex: Math.max(item.value, 0.15) }} title={`${item.label}: ${item.value}`} />
                  ))}
                  {(data?.total_systems ?? systemRows.length) === 0 && <div className="telemetry-rail-empty">No systems reporting</div>}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <PostureLegend label="Online" value={data?.online_systems ?? 0} tone="online" />
                  <PostureLegend label="Attention" value={data?.warning_systems ?? 0} tone="warning" />
                  <PostureLegend label="Offline" value={data?.offline_systems ?? 0} tone="offline" />
                </div>
                 <div className="flex items-center justify-between border-t border-border pt-4 font-mono-data text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                   <span>Events received / 24h</span>
                  <span className="text-foreground">{data?.events_last_24h ?? 0}</span>
                </div>
              </div>
            </Panel>
            <Panel className="animate-rise animate-rise-delay-2">
              <div className="flex items-start justify-between border-b border-border px-5 py-5"><div><p className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Latest event</p><h2 className="mt-1 text-base font-semibold">Latest event</h2></div><Activity className="h-4 w-4 text-primary" /></div>
               {data?.latest_event ? <div className="p-5"><div className="flex items-start justify-between gap-3"><StatusPill status={systemRows.find((system) => system.name === data.latest_event?.system_name)?.derived_status ?? 'online'} /><span className="font-mono-data text-[10px] text-muted-foreground">{formatRelativeTime(data.latest_event.created_at)}</span></div><p className="mt-5 text-sm font-medium text-foreground">{data.latest_event.event_type}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{data.latest_event.message || 'No event message.'}</p><div className="mt-5 flex items-center gap-2 border-t border-border pt-4"><span className="font-mono-data text-xs text-primary">{data.latest_event.system_name}</span><span className="text-border">/</span><span className="font-mono-data text-[10px] text-muted-foreground">{formatTimestamp(data.latest_event.created_at)}</span></div></div> : <div className="p-5"><EmptyState title="No events yet" detail="The latest event will appear here." /></div>}
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_2.08fr]">
            <Panel className="animate-rise animate-rise-delay-2">
              <div className="flex items-start justify-between border-b border-border px-5 py-5"><div><p className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Cluster Health</p><h2 className="mt-1 text-base font-semibold">Node Status</h2></div><ChevronLink href="/systems">View nodes</ChevronLink></div>
              <div className="divide-y divide-border/70">
                {systemRows.length === 0 ? <div className="p-5"><EmptyState title="No nodes registered" detail="Send a heartbeat to begin monitoring." /></div> : systemRows.slice(0, 5).map((system) => <div className="flex items-center gap-3 px-5 py-4 transition hover:bg-muted/20" key={system.id} data-testid={`row-system-${system.id}`}><span className={`status-dot status-dot-${system.derived_status}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{system.name}</p><p className="mt-1 font-mono-data text-[10px] text-muted-foreground">{system.id}</p></div><div className="text-right"><StatusPill status={system.derived_status} compact /><p className="mt-1 font-mono-data text-[10px] text-muted-foreground">{formatRelativeTime(system.last_ping)}</p></div></div>)}
              </div>
            </Panel>
            <Panel className="animate-rise animate-rise-delay-3">
              <div className="flex items-start justify-between border-b border-border px-5 py-5"><div><p className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Event stream</p><h2 className="mt-1 text-base font-semibold">Recent events</h2></div><ChevronLink href="/logs">Open event log</ChevronLink></div>
              <div className="divide-y divide-border/70">
                {logRows.length === 0 ? <div className="p-5"><EmptyState title="No events" detail="New events appear here." /></div> : logRows.slice(0, 5).map((log) => <div className="group flex items-center gap-3 px-5 py-4 transition hover:bg-muted/20" key={log.id} data-testid={`row-log-${log.id}`}><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground"><Activity className="h-3.5 w-3.5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono-data text-xs text-foreground">{log.event_type}</span><span className="text-border">·</span><span className="truncate text-xs text-muted-foreground">{log.system_name}</span></div><p className="mt-1 truncate text-xs text-muted-foreground">{log.message || 'No message'}</p></div><span className="shrink-0 font-mono-data text-[10px] text-muted-foreground">{formatRelativeTime(log.created_at)}</span><ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" /></div>)}
              </div>
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <TelegramWidget />
            <Panel className="animate-rise animate-rise-delay-3 flex min-h-[230px] flex-col justify-between overflow-hidden border-l-2 border-l-primary/40 p-5">
              <div>
                <p className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Dispatch</p>
                <h2 className="mt-1 text-base font-semibold">Send an alert.</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Send operational alerts when a node needs attention.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-2 font-mono-data text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <span className="rounded-md border border-border bg-secondary px-2.5 py-1.5">Server delivery</span>
                <span className="rounded-md border border-border bg-secondary px-2.5 py-1.5">Delivery logged</span>
              </div>
            </Panel>
          </div>
        </>
      )}
    </section>
  );
}

function MetricCard({ label, value, detail, icon, accent }: { label: string; value: number; detail: string; icon: ReactNode; accent: string }) {
  const accentClass = accent === 'online' ? 'text-[hsl(158_72%_60%)]' : accent === 'warning' ? 'text-[hsl(38_92%_66%)]' : accent === 'offline' ? 'text-[hsl(3_77%_68%)]' : accent === 'primary' ? 'text-primary' : 'text-foreground';
  return <div className="telemetry-status-cell"><div className="flex items-center justify-between"><p className="font-mono-data text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p><span className={accentClass}>{icon}</span></div><p className={`mt-3 text-2xl font-semibold tracking-[-0.05em] ${accentClass}`} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function PostureLegend({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={`status-dot status-dot-${tone}`} /><span className="text-xs text-muted-foreground">{label}</span></div><span className="font-mono-data text-xs text-foreground">{value}</span></div>;
}

function OverviewSkeleton() {
  return <div className="mt-8 space-y-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <div className="skeleton h-32 rounded-xl" key={index} />)}</div><div className="grid gap-6 xl:grid-cols-[1.38fr_0.92fr]"><div className="skeleton h-72 rounded-xl" /><div className="skeleton h-72 rounded-xl" /></div><LoadingRows count={4} /></div>;
}