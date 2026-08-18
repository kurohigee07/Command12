import { useState } from 'react';
import { Activity, ArrowRight, BellRing, BrainCircuit, CheckCircle2, Code2, RadioTower, Workflow } from 'lucide-react';
import { Link } from 'wouter';
import { useGetDashboardSummary, useGetNotificationStatus } from '@workspace/api-client-react';
import { ApiScraperWorkspace } from '@/components/workspaces/ApiScraperWorkspace';
import { IntelligenceAutoBuilder } from '@/components/workspaces/IntelligenceAutoBuilder';
import { TelemetryHealthTab } from '@/components/workspaces/TelemetryHealthTab';

type TabId = 'api-scraper' | 'intelligence-builder' | 'telemetry-health';

const tabs: Array<{ id: TabId; label: string; icon: typeof Code2 }> = [
  { id: 'api-scraper', label: 'API & Scraper', icon: Code2 },
  { id: 'intelligence-builder', label: 'Build Pipeline', icon: BrainCircuit },
  { id: 'telemetry-health', label: 'Telemetry', icon: Activity },
];

export default function Overview() {
  const [activeTab, setActiveTab] = useState<TabId>('telemetry-health');
  const summary = useGetDashboardSummary();
  const notifications = useGetNotificationStatus();
  const totalSystems = summary.data?.total_systems ?? 0;
  const onlineSystems = summary.data?.online_systems ?? 0;
  const notificationCount = Number(Boolean(notifications.data?.telegram_configured)) + Number(Boolean(notifications.data?.discord_configured));

  return (
    <div className="cc-grid -mx-4 min-h-[calc(100dvh-9rem)] rounded-2xl px-4 pb-10 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-5 pt-2">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="font-mono-data text-[10px] uppercase tracking-[0.24em]">Command overview</span>
          </div>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Command overview.
            <br />
            <span className="text-muted-foreground">Nodes and events.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Send requests, run builds, and inspect node status.
          </p>
        </div>
      </div>

      <section className="mt-7 grid gap-4 xl:grid-cols-[1.35fr_0.8fr_0.8fr]" aria-label="Command actions">
        <div className="cc-panel cc-scanline relative overflow-hidden rounded-xl border-primary/25 bg-primary/[0.06] p-5 sm:p-6">
          <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
          <div className="relative flex h-full flex-col justify-between gap-6">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                <Workflow className="h-4 w-4" />
              </div>
              <div>
                <p className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-primary">Primary action</p>
                <h2 className="mt-1 text-base font-semibold text-foreground">Run a build pipeline</h2>
                <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
                  Start a run and follow each stage from the server event feed.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('intelligence-builder')}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110"
                data-testid="button-open-build-pipeline"
              >
                Open Build Pipeline <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono-data text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Live progress enabled</span>
            </div>
          </div>
        </div>

        <div className="cc-panel rounded-xl border-border/80 p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Fleet posture</p>
            <RadioTower className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {summary.isLoading ? '—' : `${onlineSystems}/${totalSystems}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">nodes online</p>
          <Link href="/systems" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:text-foreground" data-testid="link-overview-nodes">
            View nodes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="cc-panel rounded-xl border-border/80 p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Integrations</p>
            <BellRing className="h-4 w-4 text-accent" />
          </div>
          <p className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-foreground">
            {notifications.isLoading ? '—' : `${notificationCount}/2`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">channels configured</p>
          <button
            type="button"
            onClick={() => setActiveTab('telemetry-health')}
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary transition hover:text-foreground"
            data-testid="button-overview-integrations"
          >
            Check dispatch <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>

      <div className="mt-8 overflow-x-auto border-b border-zinc-800" role="tablist" aria-label="Command hub workspaces">
        <div className="flex min-w-max gap-1">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${id}`}
                id={`tab-${id}`}
                onClick={() => setActiveTab(id)}
                className={`group relative inline-flex items-center gap-2 rounded-t-lg px-4 py-3 font-mono-data text-[10px] uppercase tracking-[0.12em] transition sm:px-5 ${
                  active ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-900/70 hover:text-zinc-300'
                }`}
                data-testid={`tab-${id}`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-primary' : 'text-zinc-600 group-hover:text-zinc-300'}`} />
                {label}
                {active && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary sm:inset-x-4" />}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id="panel-api-scraper"
        role="tabpanel"
        aria-labelledby="tab-api-scraper"
        hidden={activeTab !== 'api-scraper'}
      >
        <ApiScraperWorkspace />
      </div>
      <div
        id="panel-intelligence-builder"
        role="tabpanel"
        aria-labelledby="tab-intelligence-builder"
        hidden={activeTab !== 'intelligence-builder'}
      >
        <IntelligenceAutoBuilder />
      </div>
      <div
        id="panel-telemetry-health"
        role="tabpanel"
        aria-labelledby="tab-telemetry-health"
        hidden={activeTab !== 'telemetry-health'}
      >
        <TelemetryHealthTab />
      </div>
    </div>
  );
}