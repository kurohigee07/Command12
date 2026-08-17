export type AlertUrgency = "TINGGI" | "SEDANG" | "RENDAH";
export type NotificationChannel = "telegram" | "discord";

export const ALERT_ROUTING: Record<AlertUrgency, NotificationChannel[]> = {
  TINGGI: ["telegram", "discord"],
  SEDANG: ["telegram"],
  RENDAH: ["telegram"],
};

export const DEFAULT_MANUAL_CHANNELS: NotificationChannel[] = ["telegram"];