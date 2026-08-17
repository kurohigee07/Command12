import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import {
  TriggerPipelineBody,
  TriggerPipelineResponse,
} from "@workspace/api-zod";
import {
  hasRecentManualTrigger,
  isPipelineRunning,
  recordPipelineLog,
  startPipelineRun,
  type PipelineSource,
} from "../lib/pipeline-runner";

const router: IRouter = Router();

router.post("/pipeline/trigger", async (req, res): Promise<void> => {
  if (!isAuthorizedManualTrigger(req)) {
    req.log.warn("Rejected pipeline trigger with invalid origin or secret");
    res.status(401).json({ error: "Pipeline trigger authentication failed" });
    return;
  }

  const parsedBody = TriggerPipelineBody.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  const source = (parsedBody.data.source ?? "dashboard") as PipelineSource;
  const runId = crypto.randomUUID();

  if (isPipelineRunning()) {
    await recordPipelineLog({
      eventType: "manual_trigger",
      message: "Manual pipeline trigger rejected because another run is active.",
      runId,
      source,
      outcome: "already_running",
    });
    res.status(409).json({ error: "A pipeline run is already in progress." });
    return;
  }

  if (await hasRecentManualTrigger()) {
    await recordPipelineLog({
      eventType: "manual_trigger",
      message: "Manual pipeline trigger rejected by the five-minute rate limit.",
      runId,
      source,
      outcome: "rate_limited",
    });
    res.status(429).json({ error: "Manual pipeline trigger is limited to once every five minutes." });
    return;
  }

  const logId = await recordPipelineLog({
    eventType: "manual_trigger",
    message: "Manual pipeline trigger accepted.",
    runId,
    source,
    outcome: "accepted",
  });

  await startPipelineRun({
    source,
    requestedBy: req.ip,
    runId,
  });

  res.status(202).json(
    TriggerPipelineResponse.parse({
      accepted: true,
      run_id: runId,
      status: "queued",
      message: "Pipeline accepted. Follow progress in the event feed.",
      log_id: logId,
    }),
  );
});

router.post("/cron/daily-dispatch", async (req, res): Promise<void> => {
  const configuredSecret = process.env.CRON_SECRET;
  const suppliedSecret = req.header("x-cron-secret") ?? req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configuredSecret || suppliedSecret !== configuredSecret) {
    req.log.warn("Rejected cron pipeline trigger");
    res.status(401).json({ error: "Invalid cron secret" });
    return;
  }

  if (isPipelineRunning()) {
    res.status(409).json({ error: "A pipeline run is already in progress." });
    return;
  }

  const runId = await startPipelineRun({ source: "cron", requestedBy: "cron" });
  res.status(202).json({ accepted: true, run_id: runId, status: "queued" });
});

function isAuthorizedManualTrigger(req: Request) {
  const configuredSecret = process.env.PIPELINE_TRIGGER_SECRET ?? process.env.CRON_SECRET;
  const suppliedSecret =
    req.header("x-pipeline-secret") ??
    req.header("x-cron-secret") ??
    req.header("authorization")?.replace(/^Bearer\s+/i, "");

  if (configuredSecret && suppliedSecret === configuredSecret) return true;

  const requestOrigin = req.header("origin") ?? req.header("referer");
  if (!requestOrigin) return false;

  try {
    return new URL(requestOrigin).host === req.get("host");
  } catch {
    return false;
  }
}

export default router;