import { useState } from 'react';
import { Activity, BrainCircuit, Code2 } from 'lucide-react';
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