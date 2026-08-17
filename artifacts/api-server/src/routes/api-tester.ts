import { lookup } from "node:dns/promises";
import net from "node:net";
import { Router, type IRouter } from "express";
import {
  ExecuteApiTesterRequestBody,
  ExecuteApiTesterRequestResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const BLOCKED_REQUEST_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  const version = net.isIP(normalized);

  if (version === 4) {
    const octets = normalized.split(".").map(Number);
    const [first, second] = octets;
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  if (version === 6) {
    if (normalized === "::1" || normalized === "::") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
    if (normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true;
    if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
    if (normalized.startsWith("::ffff:")) {
      return isPrivateAddress(normalized.slice("::ffff:".length));
    }
  }

  return false;
}

async function assertSafeTarget(rawUrl: string): Promise<URL> {
  let target: URL;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new Error("URL tidak valid");
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    throw new Error("URL harus menggunakan http atau https");
  }
  if (target.username || target.password) {
    throw new Error("URL dengan username atau password tidak diizinkan");
  }

  const hostname = target.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Target lokal tidak diizinkan");
  }
  if (isPrivateAddress(hostname)) {
    throw new Error("Target jaringan internal tidak diizinkan");
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Host URL tidak dapat ditemukan");
  }
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Target jaringan internal tidak diizinkan");
  }

  return target;
}

function getForwardedHeaders(input: Record<string, string>): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(input)) {
    if (!BLOCKED_REQUEST_HEADERS.has(name.toLowerCase())) {
      headers.set(name, value);
    }
  }
  return headers;
}

async function readResponseBody(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("UPSTREAM_RESPONSE_TOO_LARGE");
    }
    chunks.push(value);
  }

  let body = "";
  for (const chunk of chunks) body += decoder.decode(chunk, { stream: true });
  body += decoder.decode();
  return body;
}

async function fetchWithSafeRedirects(
  initialUrl: URL,
  init: RequestInit,
): Promise<{ response: Response; finalUrl: URL }> {
  let target = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(target, {
        ...init,
        redirect: "manual",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return { response, finalUrl: target };
    }

    const location = response.headers.get("location");
    if (!location) return { response, finalUrl: target };
    if (redirectCount === MAX_REDIRECTS) {
      throw new Error("Terlalu banyak redirect");
    }
    target = await assertSafeTarget(new URL(location, target).toString());
  }

  throw new Error("Terlalu banyak redirect");
}

router.post("/api-tester/execute", async (req, res): Promise<void> => {
  const parsed = ExecuteApiTesterRequestBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.flatten() }, "Invalid API tester request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { url, method, headers: requestHeaders = {}, body } = parsed.data;
  if (!ALLOWED_METHODS.has(method)) {
    res.status(400).json({ error: `Method ${method} tidak diizinkan` });
    return;
  }

  if (body != null && body.length > 1_000_000) {
    res.status(400).json({ error: "Request body terlalu besar (maksimum 1 MB)" });
    return;
  }

  if (body != null && body.trim().length > 0) {
    try {
      JSON.parse(body);
    } catch {
      res.status(400).json({ error: "JSON body tidak valid" });
      return;
    }
  }

  let target: URL;
  try {
    target = await assertSafeTarget(url);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "URL target tidak valid",
    });
    return;
  }

  const headers = getForwardedHeaders(requestHeaders);
  if (body != null && body.trim().length > 0 && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const startedAt = Date.now();
  try {
    const { response, finalUrl } = await fetchWithSafeRedirects(target, {
      method,
      headers,
      body: method === "GET" || method === "DELETE" ? undefined : body ?? undefined,
    });
    const bodyText = await readResponseBody(response);
    const contentType = response.headers.get("content-type") ?? "";
    let responseBody: unknown = bodyText;

    if (contentType.includes("json") && bodyText.trim().length > 0) {
      try {
        responseBody = JSON.parse(bodyText);
      } catch {
        responseBody = bodyText;
      }
    }

    const result = {
      request: { url: finalUrl.toString(), method },
      status: response.status,
      status_text: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      body_text: bodyText,
      elapsed_ms: Date.now() - startedAt,
    };
    res.json(ExecuteApiTesterRequestResponse.parse(result));
  } catch (error) {
    const message =
      error instanceof Error && error.message === "UPSTREAM_RESPONSE_TOO_LARGE"
        ? "Response dari upstream terlalu besar (maksimum 2 MB)"
        : error instanceof Error && error.name === "AbortError"
          ? "Request upstream timeout setelah 15 detik"
          : error instanceof Error
            ? error.message
            : "Request upstream gagal";
    const status = message.includes("terlalu besar") ? 413 : 502;
    req.log.warn({ err: error, target: url, status }, "API tester upstream request failed");
    res.status(status).json({ error: message });
  }
});

export default router;