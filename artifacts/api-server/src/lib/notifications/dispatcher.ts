import { db, systemLogsTable } from "@workspace/db";
import {
  ALERT_ROUTING,
  DEFAULT_MANUAL_CHANNELS,
  type AlertUrgency,
  type NotificationChannel,
} from "./config";

type TelegramApiResponse = {
  ok?: boolean;
  description?: string;
  result?: { message_id?: number };
};

type DeliveryResult = {
  channel: NotificationChannel;
  delivered: boolean;
  messageId?: number | null;
  logId: string;
  error?: string;
};

export function getNotificationStatus() {
  return {
    telegram_configured: Boolean(
      process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID,
    ),
    discord_configured: Boolean(process.env.DISCORD_WEBHOOK_URL),
  };
}

export async function dispatchAlert(input: {
  message: string;
  urgency: AlertUrgency;
  source: "manual" | "automatic";
  channels?: NotificationChannel[];
}): Promise<DeliveryResult[]> {
  const channels = input.channels ?? ALERT_ROUTING[input.urgency] ?? DEFAULT_MANUAL_CHANNELS;
  const results: DeliveryResult[] = [];

  for (const channel of channels) {
    if (channel === "telegram") {
      results.push(await deliverTelegram(input));
    } else {
      results.push(await deliverDiscord(input));
    }
  }

  return results;
}

async function deliverTelegram(input: {
  message: string;
  urgency: AlertUrgency;
  source: "manual" | "automatic";
}): Promise<DeliveryResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return recordDelivery({
      channel: "telegram",
      message: input.message,
      urgency: input.urgency,
      source: input.source,
      delivered: false,
      error: "Telegram integration is not configured",
    });
  }

  const outboundMessage =
    input.urgency === "TINGGI" ? `URGENT ALERT\n\n${input.message}` : input.message;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${encodeURIComponent(token)}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: outboundMessage,
          disable_web_page_preview: true,
        }),
      },
    );
    const body = (await response.json()) as TelegramApiResponse;
    if (!response.ok || body.ok !== true) {
      throw new Error(
        typeof body.description === "string" && body.description
          ? body.description.slice(0, 240)
          : `Telegram API returned HTTP ${response.status}`,
      );
    }

    return recordDelivery({
      channel: "telegram",
      message: input.message,
      urgency: input.urgency,
      source: input.source,
      delivered: true,
      messageId:
        typeof body.result?.message_id === "number"
          ? body.result.message_id
          : null,
    });
  } catch (error) {
    return recordDelivery({
      channel: "telegram",
      message: input.message,
      urgency: input.urgency,
      source: input.source,
      delivered: false,
      error: error instanceof Error ? error.message.slice(0, 240) : "Telegram delivery failed",
    });
  }
}

async function deliverDiscord(input: {
  message: string;
  urgency: AlertUrgency;
  source: "manual" | "automatic";
}): Promise<DeliveryResult> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return recordDelivery({
      channel: "discord",
      message: input.message,
      urgency: input.urgency,
      source: input.source,
      delivered: false,
      error: "Discord integration is not configured",
    });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: input.message,
        embeds: [
          {
            title: `${input.urgency} ALERT`,
            description: input.message,
            color: urgencyColor(input.urgency),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook returned HTTP ${response.status}`);
    }

    return recordDelivery({
      channel: "discord",
      message: input.message,
      urgency: input.urgency,
      source: input.source,
      delivered: true,
    });
  } catch (error) {
    return recordDelivery({
      channel: "discord",
      message: input.message,
      urgency: input.urgency,
      source: input.source,
      delivered: false,
      error: error instanceof Error ? error.message.slice(0, 240) : "Discord delivery failed",
    });
  }
}

async function recordDelivery(input: {
  channel: NotificationChannel;
  message: string;
  urgency: AlertUrgency;
  source: "manual" | "automatic";
  delivered: boolean;
  messageId?: number | null;
  error?: string;
}): Promise<DeliveryResult> {
  const [log] = await db
    .insert(systemLogsTable)
    .values({
      systemName: `${input.channel}-dispatcher`,
      eventType: `${input.channel}_broadcast`,
      message: input.message,
      payload: {
        channel: input.channel,
        urgency: input.urgency,
        source: input.source,
        outcome: input.delivered ? "success" : "failed",
        ...(input.messageId !== undefined ? { message_id: input.messageId } : {}),
        ...(input.error ? { error: input.error } : {}),
      },
    })
    .returning({ id: systemLogsTable.id });

  return {
    channel: input.channel,
    delivered: input.delivered,
    messageId: input.messageId,
    logId: log.id,
    ...(input.error ? { error: input.error } : {}),
  };
}

function urgencyColor(urgency: AlertUrgency) {
  if (urgency === "TINGGI") return 0xef4444;
  if (urgency === "SEDANG") return 0xf59e0b;
  return 0x3b82f6;
}