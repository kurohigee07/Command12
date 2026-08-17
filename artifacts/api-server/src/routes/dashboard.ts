import { Router, type IRouter } from "express";
import { and, desc, eq, gte, count } from "drizzle-orm";
import { db, systemLogsTable, systemsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  IngestTelemetryBody,
  IngestTelemetryHeader,
  IngestTelemetryResponse,
  ListSystemLogsQueryParams,
  ListSystemLogsResponse,
  ListSystemsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
type Status = "online" | "warning" | "offline";

function getDerivedStatus(lastPing: Date): Status {
  const ageMs = Date.now() - lastPing.getTime();
  if (ageMs < 5 * 60 * 1000) return "online";
  if (ageMs < 15 * 60 * 1000) return "warning";
  return "offline";
}

function toSystemResponse(system: typeof systemsTable.$inferSelect) {
  return {
    id: system.id,
    name: system.name,
    status: system.status as Status,
    derived_status: getDerivedStatus(system.lastPing),
    last_ping: system.lastPing,
    metadata: system.metadata,
    created_at: system.createdAt,
  };
}

function toLogResponse(log: typeof systemLogsTable.$inferSelect) {
  return {
    id: log.id,
    system_name: log.systemName,
    event_type: log.eventType,
    message: log.message,
    payload: log.payload,
    created_at: log.createdAt,
  };
}

router.get("/systems", async (req, res): Promise<void> => {
  const systems = await db
    .select()
    .from(systemsTable)
    .orderBy(desc(systemsTable.lastPing));

  res.json(ListSystemsResponse.parse(systems.map(toSystemResponse)));
});

router.get("/system-logs", async (req, res): Promise<void> => {
  const parsedQuery = ListSystemLogsQueryParams.safeParse(req.query);
  if (!parsedQuery.success) {
    req.log.warn({ errors: parsedQuery.error.flatten() }, "Invalid log query");
    res.status(400).json({ error: parsedQuery.error.message });
    return;
  }

  const { limit, system_name: systemName } = parsedQuery.data;
  const logs = await db
    .select()
    .from(systemLogsTable)
    .where(systemName ? eq(systemLogsTable.systemName, systemName) : undefined)
    .orderBy(desc(systemLogsTable.createdAt))
    .limit(limit);

  res.json(ListSystemLogsResponse.parse(logs.map(toLogResponse)));
});

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [systems, [{ value: eventsLast24h }], [latestLog]] = await Promise.all([
    db.select().from(systemsTable),
    db
      .select({ value: count() })
      .from(systemLogsTable)
      .where(gte(systemLogsTable.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))),
    db.select().from(systemLogsTable).orderBy(desc(systemLogsTable.createdAt)).limit(1),
  ]);

  const derivedStatuses = systems.map((system) => getDerivedStatus(system.lastPing));
  const summary = {
    total_systems: systems.length,
    online_systems: derivedStatuses.filter((status) => status === "online").length,
    warning_systems: derivedStatuses.filter((status) => status === "warning").length,
    offline_systems: derivedStatuses.filter((status) => status === "offline").length,
    events_last_24h: Number(eventsLast24h),
    latest_event: latestLog ? toLogResponse(latestLog) : null,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.post("/telemetry", async (req, res): Promise<void> => {
  const header = IngestTelemetryHeader.safeParse({
    "X-API-KEY": req.header("X-API-KEY"),
  });
  const configuredSecret = process.env.TELEMETRY_INGEST_SECRET;

  if (!configuredSecret) {
    req.log.error("Telemetry ingest secret is not configured");
    res.status(503).json({ error: "Telemetry ingestion is not configured" });
    return;
  }

  if (!header.success || header.data["X-API-KEY"] !== configuredSecret) {
    req.log.warn("Rejected telemetry request with invalid API key");
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  const body = IngestTelemetryBody.safeParse(req.body);
  if (!body.success) {
    req.log.warn({ errors: body.error.flatten() }, "Invalid telemetry body");
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { system_name: systemName, status, event_type: eventType, message, payload } = body.data;
  const [log] = await db
    .insert(systemLogsTable)
    .values({
      systemName,
      eventType,
      message: message ?? null,
      payload: payload ?? {},
    })
    .returning();

  const [system] = await db
    .insert(systemsTable)
    .values({
      name: systemName,
      status,
      lastPing: new Date(),
      metadata: payload ?? {},
    })
    .onConflictDoUpdate({
      target: systemsTable.name,
      set: {
        status,
        lastPing: new Date(),
        metadata: payload ?? {},
      },
    })
    .returning();

  const response = {
    success: true,
    system: toSystemResponse(system),
    log: toLogResponse(log),
  };

  res.json(IngestTelemetryResponse.parse(response));
});

export default router;