import { BrainCircuit } from 'lucide-react';
import { Panel } from '@/components/command-ui';
import { AiCouncilBuilder } from '@/components/workspaces/AiCouncilBuilder';
import { NicheIntelligenceFeed } from '@/components/workspaces/NicheIntelligenceFeed';

export function IntelligenceAutoBuilder() {
  return (
    <section className="mt-8 space-y-6" aria-label="Build pipeline workspace">
      <Panel className="cc-scanline overflow-hidden border-zinc-800 bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-5 border-b border-zinc-800 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-zinc-500">Workspace / build</p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-100">Build Pipeline</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                Run the build pipeline and stage the generated plan.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-zinc-800 bg-zinc-800/60 px-2.5 py-1 font-mono-data text-[10px] uppercase tracking-[0.14em] text-zinc-400">
            Ready
          </span>
        </div>

        <div className="grid items-start gap-4 p-5 sm:p-6">
          <NicheIntelligenceFeed />
          <div className="mx-0 w-full max-w-none">
            <AiCouncilBuilder />
          </div>
        </div>
      </Panel>
    </section>
  );
}