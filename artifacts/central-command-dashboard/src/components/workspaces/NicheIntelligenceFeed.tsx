import {
  Cloud,
  ExternalLink,
  RadioTower,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Panel } from '@/components/command-ui';

type Urgency = 'High' | 'Medium' | 'Low';

type BriefingItem = {
  id: string;
  theme: string;
  title: string;
  summary: string;
  source: string;
  timestamp: string;
  urgency: Urgency;
  icon: LucideIcon;
  iconClassName: string;
};

const BRIEFING_ITEMS: BriefingItem[] = [
  {
    id: 'cybersecurity-patches',
    theme: 'Security',
    title: 'Runtime patch queue updated',
    summary:
      'Kernel, identity, and gateway updates are pending validation before rollout.',
    source: 'Security feed',
    timestamp: '08:40 UTC',
    urgency: 'High',
    icon: ShieldCheck,
    iconClassName: 'border-red-400/20 bg-red-400/10 text-red-300',
  },
  {
    id: 'api-automation-trends',
    theme: 'Automation',
    title: 'Event-driven jobs replace long polling',
    summary:
      'Typed contracts and replayable events define retry boundaries.',
    source: 'Automation feed',
    timestamp: '07:55 UTC',
    urgency: 'Medium',
    icon: Zap,
    iconClassName: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  },
  {
    id: 'tech-cloud-news',
    theme: 'Capacity',
    title: 'Compute pool allocation changed',
    summary:
      'Workloads can be placed across smaller pools to control latency and spend.',
    source: 'Infrastructure feed',
    timestamp: '06:20 UTC',
    urgency: 'Low',
    icon: Cloud,
    iconClassName: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  },
];

const urgencyClassName: Record<Urgency, string> = {
  High: 'border-red-400/30 bg-red-400/10 text-red-300',
  Medium: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  Low: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
};

export function NicheIntelligenceFeed() {
  return (
    <Panel className="cc-scanline overflow-hidden border-zinc-800 bg-zinc-900" data-testid="panel-daily-briefing">
      <div className="briefing-header flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-accent/25 bg-accent/10 text-accent">
            <RadioTower className="h-4 w-4" />
          </div>
          <div>
          <p className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-zinc-500">Events / local feed</p>
            <h3 className="mt-1 text-base font-semibold text-zinc-100">Event Feed</h3>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              Events for the current run.
            </p>
          </div>
        </div>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono-data text-[10px] uppercase tracking-[0.14em] text-primary">
          03 items
        </span>
      </div>

      <div className="briefing-list space-y-3 p-4 sm:p-5">
        {BRIEFING_ITEMS.map((item, index) => {
          const Icon = item.icon;
          return (
            <article
              key={item.id}
              className={`briefing-item animate-rise animate-rise-delay-${Math.min(index + 1, 3)} rounded-lg border border-zinc-800 bg-zinc-950/55 p-4 transition-colors hover:border-zinc-700`}
              data-testid={`card-briefing-${item.id}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${item.iconClassName}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono-data text-[10px] uppercase tracking-[0.15em] text-zinc-500">{item.theme}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono-data text-[10px] uppercase tracking-[0.12em] ${urgencyClassName[item.urgency]}`}
                      data-testid={`badge-urgency-${item.id}`}
                    >
                      {item.urgency}
                    </span>
                  </div>
                  <h4 className="mt-2 text-sm font-semibold leading-5 text-zinc-100">{item.title}</h4>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">{item.summary}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-800/80 pt-3 font-mono-data text-[10px] uppercase tracking-[0.1em] text-zinc-600">
                    <span>{item.source}</span>
                    <span className="text-zinc-700">/</span>
                    <span>{item.timestamp}</span>
                    <ExternalLink className="ml-auto h-3 w-3 text-zinc-700" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}