import { useMemo, useState } from 'react';
import {
  Check,
  CircleDot,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Terminal,
  TriangleAlert,
  Workflow,
} from 'lucide-react';
import {
  getListSystemLogsQueryKey,
  useListSystemLogs,
  useTriggerPipeline,
  type SystemLog,
} from '@workspace/api-client-react';
import { Panel, formatRelativeTime } from '@/components/command-ui';

type RunRecord = {
  runId: string;
  logId: string;
  message: string;
  status: 'queued' | 'running';
  startedAt: number;
};

type FeedState = 'waiting' | 'running' | 'complete' | 'failed';

const PIPELINE_STAGES = [
  { id: 'scout', agent: 'SCOUT', model: 'context-loader', action: 'Load Context', detail: 'Waiting for the backend runner to report context.' },
  { id: 'council', agent: 'COUNCIL', model: 'planner', action: 'Route & Validate', detail: 'Plan and policy events will appear here.' },
  { id: 'dispatch', agent: 'DISPATCH', model: 'builder', action: 'Stage Build', detail: 'The approved build is staged by the server.' },
  { id: 'complete', agent: 'SYSTEM', model: 'event-feed', action: 'Publish Result', detail: 'Completion is confirmed by a backend event.' },
] as const;

export function AiCouncilBuilder() {
  const [run, setRun] = useState<RunRecord | null>(null);
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const trigger = useTriggerPipeline();
  const logParams = useMemo(() => ({ limit: 100 }), []);
  const logs = useListSystemLogs(logParams, {
    query: {
      queryKey: getListSystemLogsQueryKey(logParams),
      refetchInterval: run ? 2500 : 10000,
    },
  });

  const runEvents = useMemo(() => {
    if (!run) return [];
    return (logs.data ?? [])
      .filter((log) => belongsToRun(log, run))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [logs.data, run]);

  const feedState = getFeedState(run, runEvents);
  const active = Boolean(run && (feedState === 'waiting' || feedState === 'running'));
  const stageIndex = getStageIndex(runEvents, feedState);
  const recentRuns = (logs.data ?? [])
    .filter((log) => log.system_name === 'pipeline' && log.event_type === 'manual_trigger')
    .slice(0, 3);

  const executePipeline = () => {
    if (active || trigger.isPending) return;
    setNotice(null);
    trigger.mutate(
      { data: { source: 'dashboard' } },
      {
        onSuccess: (response) => {
          const message = response.message || 'The pipeline returned no status message.';
          if (!response.accepted || isUnavailableMessage(message)) {
            setRun(null);
            setNotice({ tone: 'error', message: `Pipeline unavailable: ${message}` });
            return;
          }
          setRun({
            runId: response.run_id,
            logId: response.log_id,
            message,
            status: response.status,
            startedAt: Date.now(),
          });
          setNotice({ tone: 'success', message: `Run ${response.run_id} accepted. Monitoring backend events.` });
        },
        onError: (error) => {
          setRun(null);
          setNotice({ tone: 'error', message: `Pipeline unavailable: ${getErrorMessage(error)}` });
        },
      },
    );
  };

  const resetRun = () => {
    if (active) return;
    setRun(null);
    setNotice(null);
  };

  const stateLabel = trigger.isPending
    ? 'Submitting'
    : feedState === 'complete'
      ? 'Complete'
      : feedState === 'failed'
        ? 'Failed'
        : active
          ? run?.status === 'queued'
            ? 'Queued'
            : 'Running'
          : 'Ready';
  const stateClassName = feedState === 'failed'
    ? 'border-destructive/30 bg-destructive/10 text-destructive'
    : feedState === 'complete'
      ? 'border-primary/30 bg-primary/10 text-primary'
      : active || trigger.isPending
        ? 'border-accent/30 bg-accent/10 text-accent'
        : 'border-zinc-700 bg-zinc-800/60 text-zinc-400';

  return (
    <Panel className="cc-scanline mx-0 mt-8 w-full max-w-none overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/80" data-testid="panel-ai-council">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-zinc-500">Build pipeline</p>
            <h3 className="mt-1 text-lg font-semibold text-zinc-100">Build Pipeline</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
              Start the configured runner and follow its server-side event feed.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden font-mono-data text-[10px] uppercase tracking-[0.12em] text-zinc-600 sm:inline">Backend controlled</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono-data text-[10px] uppercase tracking-[0.14em] ${stateClassName}`} data-testid="status-ai-council">
            {trigger.isPending || active ? <CircleDot className="h-3 w-3 animate-pulse" /> : feedState === 'complete' ? <Check className="h-3 w-3" /> : feedState === 'failed' ? <TriangleAlert className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
            {stateLabel}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {notice && (
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs leading-5 ${notice.tone === 'error' ? 'border-destructive/25 bg-destructive/5 text-destructive' : 'border-primary/20 bg-primary/5 text-primary'}`}
            role={notice.tone === 'error' ? 'alert' : 'status'}
            data-testid={`status-pipeline-${notice.tone}`}
          >
            {notice.tone === 'error' ? <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            <span>{notice.message}</span>
          </div>
        )}

        <div className="council-stages relative space-y-3 pl-7" aria-label="Build pipeline stages">
          <div className="absolute bottom-5 left-2.5 top-5 border-l border-dashed border-zinc-800/60" aria-hidden="true" />
          {PIPELINE_STAGES.map((stage, index) => {
            const Icon = index < 2 ? (index === 0 ? Terminal : ShieldCheck) : Workflow;
            const complete = index < stageIndex;
            const current = index === stageIndex && active;
            return (
              <div className="relative" key={stage.id}>
                <span className={`absolute -left-7 top-5 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border bg-zinc-950 ${complete ? 'border-primary/60 text-primary' : current ? 'border-accent/60 text-accent' : 'border-zinc-700 text-zinc-600'}`} aria-label={`${stage.agent} ${complete ? 'complete' : current ? 'active' : 'queued'}`}>
                  {complete ? <Check className="h-2.5 w-2.5" /> : <span className={`h-1.5 w-1.5 rounded-full ${current ? 'animate-pulse bg-accent' : 'bg-current'}`} />}
                </span>
                <div className={`council-stage rounded-xl border bg-zinc-900/50 p-4 shadow-sm transition-colors ${current ? 'border-accent/30 bg-zinc-900/90' : 'border-zinc-800/80'}`} data-testid={`stage-council-${stage.id}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${complete ? 'text-primary' : current ? 'text-accent' : 'text-zinc-500'}`} />
                      <p className="font-mono-data text-[10px] uppercase tracking-[0.13em] text-zinc-200">{stage.agent}</p>
                      <span className="font-mono-data text-[10px] text-zinc-500">{stage.model}</span>
                    </div>
                    <span className="shrink-0 rounded-md border border-zinc-700/50 bg-zinc-950/80 px-2 py-0.5 font-mono-data text-[10px] text-zinc-500">{complete ? 'confirmed' : current ? 'active' : 'queued'}</span>
                  </div>
                  <p className="mt-3 text-xs font-medium text-zinc-300">{stage.action}</p>
                  <p className="mt-2 text-[10px] leading-4 text-zinc-500">{stage.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="council-console overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/90">
          <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-primary" />
              <p className="font-mono-data text-[10px] uppercase tracking-[0.15em] text-zinc-500">Backend event feed</p>
            </div>
            {active && <span className="inline-flex items-center gap-1.5 font-mono-data text-[10px] uppercase tracking-[0.12em] text-accent"><RefreshCw className="h-3 w-3" /> Polling</span>}
          </div>
          <div className="min-h-56 space-y-3 overflow-auto p-4 font-mono-data text-[11px] leading-5" role="log" aria-live="polite" data-testid="log-ai-council">
            {!run && <div className="flex items-center gap-2 text-zinc-500" data-testid="status-ai-council-idle"><Clock3 className="h-3.5 w-3.5" /> No pipeline run submitted.</div>}
            {run && <div className="flex flex-wrap gap-x-3 gap-y-1 border-b border-zinc-800 pb-3 text-zinc-500"><span className="text-primary">run_id</span> {run.runId}<span className="text-zinc-700">/</span><span className="text-primary">log_id</span> {run.logId}</div>}
            {run && runEvents.map((event) => <FeedEvent event={event} key={event.id} />)}
            {run && logs.isError && <div className="flex items-center gap-2 text-destructive" role="alert" data-testid="status-pipeline-feed-error"><TriangleAlert className="h-3.5 w-3.5" /> Event feed unavailable. Retrying on the next refresh.</div>}
            {run && !logs.isError && runEvents.length === 0 && active && <div className="flex items-center gap-2 text-zinc-500" data-testid="status-pipeline-waiting"><LoaderCircle className="h-3.5 w-3.5 animate-spin text-accent" /> Waiting for backend events.</div>}
            {run && !active && feedState === 'complete' && <div className="flex items-center gap-2 border-t border-zinc-800 pt-3 text-primary" data-testid="status-ai-council-complete"><Check className="h-3.5 w-3.5" /> Completion confirmed by the backend event feed.</div>}
            {run && !active && feedState === 'failed' && <div className="flex items-center gap-2 border-t border-zinc-800 pt-3 text-destructive" data-testid="status-ai-council-failed"><TriangleAlert className="h-3.5 w-3.5" /> The backend reported that this run failed.</div>}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={executePipeline} disabled={active || trigger.isPending} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary px-4 font-mono-data text-[11px] font-medium uppercase tracking-[0.16em] text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60" data-testid="button-execute-ai-council">
            {trigger.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Terminal className="h-4 w-4" />}
            {trigger.isPending ? 'Starting' : active ? 'Run in progress' : 'Run Now'}
          </button>
          <button type="button" onClick={resetRun} disabled={active || trigger.isPending} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/70 px-4 font-mono-data text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-reset-ai-council">
            <RefreshCw className="h-4 w-4" /> Clear run
          </button>
        </div>
      </div>

        {!run && recentRuns.length > 0 && (
          <div className="mx-5 mb-5 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/50 sm:mx-6">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div>
                <p className="font-mono-data text-[10px] uppercase tracking-[0.15em] text-zinc-500">Run history</p>
                <p className="mt-1 text-xs text-zinc-300">Recent manual triggers</p>
              </div>
              <span className="font-mono-data text-[10px] uppercase tracking-[0.12em] text-zinc-600">Last 3</span>
            </div>
            <div className="divide-y divide-zinc-800">
              {recentRuns.map((event) => {
                const outcome = typeof event.payload?.outcome === 'string' ? event.payload.outcome : 'recorded';
                const runId = typeof event.payload?.run_id === 'string' ? event.payload.run_id : 'unknown run';
                const failed = outcome === 'rate_limited' || outcome === 'already_running';
                return (
                  <div key={event.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className={`h-1.5 w-1.5 rounded-full ${failed ? 'bg-accent' : 'bg-primary'}`} />
                    <span className="min-w-0 flex-1 truncate font-mono-data text-[10px] text-zinc-300">{runId}</span>
                    <span className={`font-mono-data text-[10px] uppercase tracking-[0.1em] ${failed ? 'text-accent' : 'text-primary'}`}>{outcome}</span>
                    <span className="font-mono-data text-[10px] text-zinc-600">{formatRelativeTime(event.created_at)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </Panel>
  );
}

function FeedEvent({ event }: { event: SystemLog }) {
  return (
    <div className="flex items-start gap-3" data-testid={`log-entry-ai-council-${event.id}`}>
      <span className="shrink-0 text-zinc-600">[{new Date(event.created_at).toISOString()}]</span>
      <span className="shrink-0 font-semibold text-primary">[{event.event_type}]</span>
      <span className="min-w-0 text-zinc-300">{event.message || 'Backend event received.'}</span>
    </div>
  );
}

function belongsToRun(log: SystemLog, run: RunRecord) {
  const payload = log.payload ?? {};
  const payloadRunId = payload.run_id ?? payload.runId ?? payload.job_id;
  const searchable = `${log.event_type} ${log.message ?? ''} ${JSON.stringify(payload)}`.toLowerCase();
  return log.id === run.logId || payloadRunId === run.runId || searchable.includes(run.runId.toLowerCase());
}

function getFeedState(run: RunRecord | null, events: SystemLog[]): FeedState {
  if (!run) return 'waiting';
  const text = events.map((event) => `${event.event_type} ${event.message ?? ''} ${JSON.stringify(event.payload)}`).join(' ').toLowerCase();
  if (/(failed|failure|error|aborted|cancelled)/.test(text)) return 'failed';
  if (/(complete|completed|success|succeeded|published|finished)/.test(text)) return 'complete';
  return events.length > 0 ? 'running' : 'waiting';
}

function getStageIndex(events: SystemLog[], state: FeedState) {
  if (state === 'complete') return PIPELINE_STAGES.length;
  if (state === 'failed') return Math.min(events.length, PIPELINE_STAGES.length - 1);
  return Math.min(events.length, PIPELINE_STAGES.length - 1);
}

function isUnavailableMessage(message: string) {
  return /(unavailable|not configured|disabled|unsupported)/i.test(message);
}

function getErrorMessage(error: unknown) {
  const candidate = error as { data?: unknown; message?: unknown };
  if (typeof candidate.message === 'string' && candidate.message.trim()) return candidate.message;
  if (candidate.data && typeof candidate.data === 'object' && 'error' in candidate.data) {
    const detail = (candidate.data as { error?: unknown }).error;
    if (typeof detail === 'string' && detail.trim()) return detail;
  }
  return 'The server could not accept the pipeline trigger.';
}