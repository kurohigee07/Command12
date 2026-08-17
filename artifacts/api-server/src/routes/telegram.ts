import { Router, type IRouter } from "express";
import {
  SendTelegramMessageBody,
  SendTelegramMessageResponse,
} from "@workspace/api-zod";
import {
  dispatchAlert,
  getNotificationStatus,
} from "../lib/notifications/dispatcher";
import type { AlertUrgency, NotificationChannel } from "../lib/notifications/config";

const router: IRouter = Router();

router.post("/telegram/send", async (req, res): Promise<void> => {
  const parsedBody = SendTelegramMessageBody.safeParse(req.body);
  if (!parsedBody.success) {
    req.log.warn({ errors: parsedBody.error.flatten() }, "Invalid alert message");
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  const { message, priority = "normal", channels = ["telegram"] } = parsedBody.data;
  const urgency: AlertUrgency = priority === "urgent" ? "TINGGI" : "SEDANG";
  const selectedChannels = channels as NotificationChannel[];
  const status = getNotificationStatus();

  if (selectedChannels.includes("telegram") && !status.telegram_configured) {
    res.status(503).json({ error: "Telegram integration is not configured" });
    return;
  }
  if (selectedChannels.includes("discord") && !status.discord_configured) {
    res.status(503).json({ error: "Discord integration is not configured" });
    return;
  }

  const results = await dispatchAlert({
    message,
    urgency,
    source: "manual",
    channels: selectedChannels,
  });
  const failed = results.filter((result) => !result.delivered);
  const firstLogId = results[0]?.logId;

  if (failed.length > 0 || !firstLogId) {
    req.log.error({ failed, logId: firstLogId }, "Alert delivery failed");
    res.status(503).json({
      error: "Alert delivery failed",
      details: {
        log_id: firstLogId,
        failed_channels: failed.map((result) => result.channel),
      },
    });
    return;
  }

  const telegramResult = results.find((result) => result.channel === "telegram");
  const discordResult = results.find((result) => result.channel === "discord");
  res.json(
    SendTelegramMessageResponse.parse({
      success: true,
      message: "Alert delivered",
      priority,
      telegram_message_id: telegramResult?.messageId ?? null,
      discord_delivered: discordResult?.delivered ?? false,
      log_id: firstLogId,
    }),
  );
});

export default router;