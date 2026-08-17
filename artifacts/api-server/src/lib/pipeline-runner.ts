import { randomUUID } from "node:crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { db, systemLogsTable } from "@workspace/db";

export type PipelineSource = "dashboard" | "cron";
export type PipelineStage = "scout" | "council" | "dispatch";

let activeRunId: string | null = null;

export function isPipelineRunning() {
  return activeRunId !== null;
}

export async function hasRecentManualTrigger() {
  const [recent] = await db
    .select({ id: systemLogsTable.id })
    .from(systemLogsTable)
    .where(
      and(
        eq(systemLogsTable.systemName, "pipeline"),
        eq(systemLogsTable.eventType, "manual_trigger"),
        gte(systemLogsTable.createdAt, new Date(Date.now() - 5 * 60 * 1000)),
      ),
    )
    .orderBy(desc(systemLogsTable.createdAt))
    .limit(1);

  return Boolean(recent);
}

export async function recordPipelineLog(input: {
  eventType: string;
  message: string;
  runId: string;
  source: PipelineSource;
  stage?: PipelineStage;
  outcome?: string;
  error?: string;
}) {
  const [log] = await db
    .insert(systemLogsTable)
    .values({
      systemName: "pipeline",
      eventType: input.eventType,
      message: input.message,
      payload: {
        run_id: input.runId,
        source: input.source,
        ...(input.stage ? { stage: input.stage } : {}),
        ...(input.outcome ? { outcome: input.outcome } : {}),
        ...(input.error ? { error: input.error } : {}),
      },
    })
    .returning({ id: systemLogsTable.id });

  return log.id;
}

export async function startPipelineRun(input: {
  source: PipelineSource;
  requestedBy?: string;
  runId?: string;
}) {
  const runId = input.runId ?? randomUUID();
  activeRunId = runId;
  void runPipeline({ ...input, runId }).finally(() => {
    if (activeRunId === runId) activeRunId = null;
  });
  return runId;
}

async function runPipeline(input: {
  runId: string;
  source: PipelineSource;
  requestedBy?: string;
}) {
  await recordPipelineLog({
    eventType: "pipeline_started",
    message: "Pipeline run started.",
    runId: input.runId,
    source: input.source,
    outcome: "started",
  });

  for (const stage of ["scout", "council", "dispatch"] as const) {
    const stageLogId = await recordPipelineLog({
      eventType: "pipeline_stage_started",
      message: `${stageLabel(stage)} stage started.`,
      runId: input.runId,
      source: input.source,
      stage,
      outcome: "started",
    });

    try {
      await executeConfiguredStage(stage, input);
      await recordPipelineLog({
        eventType: "pipeline_stage_completed",
        message: `${stageLabel(stage)} stage completed.`,
        runId: input.runId,
        source: input.source,
        stage,
        outcome: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 240) : "Pipeline stage failed";
      await recordPipelineLog({
        eventType: "pipeline_stage_failed",
        message: `${stageLabel(stage)} stage blocked.`,
        runId: input.runId,
        source: input.source,
        stage,
        outcome: "failed",
        error: message,
      });
      await recordPipelineLog({
        eventType: "pipeline_failed",
        message: "Pipeline stopped before completion.",
        runId: input.runId,
        source: input.source,
        outcome: "failed",
        error: message,
      });
      return { stageLogId };
    }
  }

  await recordPipelineLog({
    eventType: "pipeline_completed",
    message: "Pipeline completed successfully.",
    runId: input.runId,
    source: input.source,
    outcome: "success",
  });
  return;
}

async function executeConfiguredStage(
  stage: PipelineStage,
  input: { runId: string; source: PipelineSource; requestedBy?: string },
) {
  const endpoint = process.env[`${stage.toUpperCase()}_PIPELINE_URL`];
  if (!endpoint) {
    throw new Error(
      `${stageLabel(stage)} stage is not configured. Add ${stage.toUpperCase()}_PIPELINE_URL or restore the previous pipeline implementation.`,
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      run_id: input.runId,
      source: input.source,
      requested_by: input.requestedBy ?? "unknown",
    }),
  });

  if (!response.ok) {
    throw new Error(`${stageLabel(stage)} stage returned HTTP ${response.status}`);
  }
}

function stageLabel(stage: PipelineStage) {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}