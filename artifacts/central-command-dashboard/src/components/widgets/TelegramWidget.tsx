import { useEffect, useState } from "react";
import { LoaderCircle, Send, TriangleAlert } from "lucide-react";
import { useGetNotificationStatus, useSendTelegramMessage } from "@workspace/api-client-react";
import { Panel, ToastNotice } from "@/components/command-ui";

type Priority = "normal" | "urgent";
type Channel = "telegram" | "discord";

export function TelegramWidget() {
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [channels, setChannels] = useState<Channel[]>(["telegram"]);
  const [toast, setToast] = useState("");
  const notificationStatus = useGetNotificationStatus();

  const sendTelegramMessage = useSendTelegramMessage({
    mutation: {
      onSuccess: (result) => {
        setMessage("");
        setToast(result.message || "Alert sent");
      },
    },
  });

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!notificationStatus.data) return;
    const configured = [
      notificationStatus.data.telegram_configured ? "telegram" : null,
      notificationStatus.data.discord_configured ? "discord" : null,
    ].filter((channel): channel is Channel => channel !== null);
    setChannels((current) => {
      const available = current.filter((channel) => configured.includes(channel));
      return available.length > 0 ? available : configured.slice(0, 1);
    });
  }, [notificationStatus.data?.telegram_configured, notificationStatus.data?.discord_configured]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || channels.length === 0 || sendTelegramMessage.isPending) return;

    sendTelegramMessage.mutate({
      data: {
        message: trimmedMessage,
        priority,
        channels,
      },
    });
  };

  const telegramConfigured = notificationStatus.data?.telegram_configured ?? false;
  const discordConfigured = notificationStatus.data?.discord_configured ?? false;
  const toggleChannel = (channel: Channel) => {
    if (channel === "discord" && !discordConfigured) return;
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((value) => value !== channel)
        : [...current, channel],
    );
  };

  return (
    <>
      <Panel className="relative overflow-hidden">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Dispatch / Telegram
            </p>
            <h2 className="mt-1 text-base font-semibold">Telegram</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Send an alert to the configured channel.
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary" aria-hidden="true">
            <Send className="h-3.5 w-3.5" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <label className="block">
            <span className="font-mono-data text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Message
            </span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={4096}
              rows={3}
              placeholder="Enter message..."
              className="mt-2 w-full resize-none rounded-lg border border-border bg-background/70 px-3 py-3 text-sm leading-6 text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
              data-testid="input-telegram-message"
              disabled={sendTelegramMessage.isPending}
            />
          </label>

          <div className="flex flex-col gap-4 border-y border-border/70 py-3">
            <fieldset className="flex items-center gap-2" aria-label="Alert priority">
              <span className="font-mono-data text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Priority
              </span>
              <div className="flex rounded-md border border-border bg-secondary p-1">
                {(["normal", "urgent"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setPriority(option)}
                    aria-pressed={priority === option}
                    className={`rounded px-2.5 py-1.5 font-mono-data text-[10px] uppercase tracking-[0.1em] transition ${
                      priority === option
                        ? option === "urgent"
                          ? "bg-[hsl(3_77%_68%_/_0.14)] text-[hsl(3_77%_72%)]"
                          : "bg-primary/12 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`button-telegram-priority-${option}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <fieldset className="flex flex-col gap-2" aria-label="Delivery channels">
                <span className="font-mono-data text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Channels</span>
                <div className="flex flex-wrap gap-2">
                  <ChannelOption
                    channel="telegram"
                    label="Telegram"
                    checked={channels.includes("telegram")}
                    disabled={!telegramConfigured || sendTelegramMessage.isPending}
                    onChange={() => toggleChannel("telegram")}
                  />
                  <ChannelOption
                    channel="discord"
                    label="Discord"
                    checked={channels.includes("discord")}
                    disabled={!discordConfigured || sendTelegramMessage.isPending}
                    onChange={() => toggleChannel("discord")}
                  />
                </div>
                <p className="max-w-sm text-[10px] leading-4 text-muted-foreground" data-testid="text-notification-channel-status">
                  {notificationStatus.isLoading
                    ? "Checking channel configuration..."
                    : notificationStatus.isError
                      ? "Channel configuration could not be checked."
                      : !discordConfigured
                        ? "Discord is disabled because no Discord webhook is configured."
                        : !telegramConfigured
                          ? "Telegram is disabled because no bot is configured."
                          : "Choose one or more configured delivery channels."}
                </p>
              </fieldset>
              <span className="font-mono-data text-[10px] text-muted-foreground">{message.length}/4096</span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono-data text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <span className={`status-dot ${telegramConfigured ? "status-dot-online" : "status-dot-warning"}`} />
              <span>Route</span>
              <span className={`ml-auto ${telegramConfigured ? "text-primary" : "text-accent"}`}>
                {notificationStatus.isLoading ? "Checking" : telegramConfigured ? "Configured" : "Unavailable"}
              </span>
          </div>

          {sendTelegramMessage.isError && (
            <div
              className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
              role="alert"
              data-testid="telegram-error"
            >
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Delivery failed. Check the Telegram configuration.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!message.trim() || channels.length === 0 || sendTelegramMessage.isPending || !telegramConfigured && !discordConfigured}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="button-send-telegram"
          >
            {sendTelegramMessage.isPending ? (
              <>
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Sending
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Send
              </>
            )}
          </button>
        </form>
      </Panel>
      {toast && <ToastNotice message={toast} onClose={() => setToast("")} />}
    </>
  );
}

function ChannelOption({
  channel,
  label,
  checked,
  disabled,
  onChange,
}: {
  channel: Channel;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs transition ${disabled ? "cursor-not-allowed border-border/60 bg-muted/20 text-muted-foreground/55" : checked ? "border-primary/35 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
        data-testid={`checkbox-channel-${channel}`}
      />
      <span>{label}</span>
      {channel === "discord" && disabled && <span className="font-mono-data text-[9px] uppercase tracking-[0.08em]">Not configured</span>}
    </label>
  );
}