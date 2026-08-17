import { Router, type IRouter } from "express";
import {
  ExtractMediaBody,
  ExtractMediaResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const SUPPORTED_PLATFORMS = [
  { platform: "tiktok" as const, hosts: ["tiktok.com", "vm.tiktok.com"] },
  { platform: "instagram" as const, hosts: ["instagram.com"] },
  { platform: "reddit" as const, hosts: ["reddit.com", "redd.it"] },
  { platform: "x" as const, hosts: ["x.com", "twitter.com"] },
];

function detectPlatform(rawUrl: string): { url: URL; platform: "tiktok" | "instagram" | "reddit" | "x" } | null {
  try {
    const url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const match = SUPPORTED_PLATFORMS.find(({ hosts }) =>
      hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`)),
    );
    return match ? { url, platform: match.platform } : null;
  } catch {
    return null;
  }
}

router.post("/scraper/extract", async (req, res): Promise<void> => {
  const parsed = ExtractMediaBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.flatten() }, "Invalid media extraction request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const detected = detectPlatform(parsed.data.url);
  if (!detected) {
    res.status(400).json({
      error: "URL harus berasal dari TikTok, Instagram, Reddit, X, atau Twitter",
    });
    return;
  }

  const providerUrl = process.env.MEDIA_SCRAPER_API_URL;
  if (!providerUrl) {
    res.status(501).json({
      error: "Media scraper provider belum dikonfigurasi",
      details: {
        platform: detected.platform,
        required_configuration: "MEDIA_SCRAPER_API_URL",
      },
    });
    return;
  }

  try {
    const providerResponse = await fetch(providerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.MEDIA_SCRAPER_API_KEY
          ? { Authorization: `Bearer ${process.env.MEDIA_SCRAPER_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        url: detected.url.toString(),
        platform: detected.platform,
        no_watermark: true,
      }),
    });

    if (!providerResponse.ok) {
      req.log.warn(
        { providerStatus: providerResponse.status, platform: detected.platform },
        "Media scraper provider rejected request",
      );
      res.status(502).json({ error: "Media scraper provider gagal memproses URL" });
      return;
    }

    const providerPayload = (await providerResponse.json()) as {
      job_id?: unknown;
      message?: unknown;
    };
    const result = {
      status: "accepted" as const,
      message:
        typeof providerPayload.message === "string"
          ? providerPayload.message
          : "Media extraction request accepted",
      url: detected.url.toString(),
      platform: detected.platform,
      job_id: typeof providerPayload.job_id === "string" ? providerPayload.job_id : null,
    };
    res.status(202).json(ExtractMediaResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error, platform: detected.platform }, "Media scraper provider failed");
    res.status(502).json({ error: "Media scraper provider tidak dapat dihubungi" });
  }
});

export default router;