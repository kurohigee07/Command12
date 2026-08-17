import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  Braces,
  CheckCircle2,
  Clock3,
  Code2,
  ExternalLink,
  FileJson,
  LoaderCircle,
  Send,
  Terminal,
} from 'lucide-react';
import {
  useExecuteApiTesterRequest,
  useExtractMedia,
  type ApiTesterResponse,
  type MediaExtractResponse,
} from '@workspace/api-client-react';
import { Panel } from '@/components/command-ui';

export function ApiScraperWorkspace() {
  const [apiUrl, setApiUrl] = useState('');
  const [apiMethod, setApiMethod] = useState<HttpMethod>('GET');
  const [headersJson, setHeadersJson] = useState('{\n  "Accept": "application/json"\n}');
  const [bodyJson, setBodyJson] = useState('');
  const [apiFieldErrors, setApiFieldErrors] = useState<ApiFieldErrors>({});
  const [apiResponse, setApiResponse] = useState<ApiTesterResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaUrlError, setMediaUrlError] = useState<string | null>(null);
  const [mediaResult, setMediaResult] = useState<MediaExtractResponse | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const apiMutation = useExecuteApiTesterRequest();
  const mediaMutation = useExtractMedia();

  const executeApiRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: ApiFieldErrors = {};
    const trimmedUrl = apiUrl.trim();
    if (!trimmedUrl) {
      nextErrors.url = 'Enter an endpoint URL.';
    } else if (!isHttpUrl(trimmedUrl)) {
      nextErrors.url = 'Use a valid http:// or https:// URL.';
    }

    const headers = parseHeaders(headersJson);
    if (headers.error) nextErrors.headers = headers.error;

    if (bodyJson.trim()) {
      try {
        JSON.parse(bodyJson);
      } catch {
        nextErrors.body = 'Body must be valid JSON before it can be sent.';
      }
    }

    setApiFieldErrors(nextErrors);
    setApiError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setApiResponse(null);
    apiMutation.mutate(
      {
        data: {
          url: trimmedUrl,
          method: apiMethod,
          headers: headers.value,
          body: bodyJson.trim() ? bodyJson : null,
        },
      },
      {
        onSuccess: (result) => {
          setApiResponse(result);
        },
        onError: (error) => {
          setApiError(getApiErrorMessage(error));
        },
      },
    );
  };

  const extractMedia = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUrl = mediaUrl.trim();
    const validationError = validateSocialUrl(trimmedUrl);
    setMediaUrlError(validationError);
    setMediaError(null);
    if (validationError) return;

    setMediaResult(null);
    mediaMutation.mutate(
      { data: { url: trimmedUrl } },
      {
        onSuccess: (result) => {
          setMediaResult(result);
        },
        onError: (error) => {
          setMediaError(getMediaErrorMessage(error));
        },
      },
    );
  };

  return (
    <section className="mt-8 space-y-6" aria-label="API and scraper workspace">
      <Panel className="cc-scanline api-workspace overflow-hidden border-zinc-800 bg-zinc-900">
        <div className="api-workspace-header flex flex-wrap items-start justify-between gap-5 border-b border-zinc-800 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-zinc-500">Workspace / ingestion</p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-100">API &amp; Scraper Workspace</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                Send API requests and queue media extraction jobs.
              </p>
            </div>
          </div>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 font-mono-data text-[10px] uppercase tracking-[0.14em] text-primary">
            Ready
          </span>
        </div>

        <div className="grid items-start gap-4 p-5 lg:grid-cols-2 lg:gap-5 sm:p-6">
          <Panel className="api-tool-panel border-zinc-800/90 bg-zinc-950/45">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                  <Terminal className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-zinc-500">Probe / upstream</p>
                  <h3 className="mt-1 text-base font-semibold text-zinc-100">API Tester</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">Send a request and inspect the response.</p>
                </div>
              </div>
              <span className="font-mono-data text-[10px] uppercase tracking-[0.14em] text-zinc-600">HTTP</span>
            </div>

            <form className="space-y-4 p-5" onSubmit={executeApiRequest} noValidate>
              <div>
                <label htmlFor="api-tester-url" className="mb-1.5 block font-mono-data text-[10px] uppercase tracking-[0.15em] text-zinc-400">URL</label>
                <input
                  id="api-tester-url"
                  type="url"
                  value={apiUrl}
                  onChange={(event) => setApiUrl(event.target.value)}
                  placeholder="https://api.example.com/v1/status"
                  className={fieldClass(Boolean(apiFieldErrors.url))}
                  data-testid="input-api-tester-url"
                />
                {apiFieldErrors.url && <FieldError message={apiFieldErrors.url} testId="error-api-tester-url" />}
              </div>

              <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                <div>
                  <label htmlFor="api-tester-method" className="mb-1.5 block font-mono-data text-[10px] uppercase tracking-[0.15em] text-zinc-400">Method</label>
                  <select
                    id="api-tester-method"
                    value={apiMethod}
                    onChange={(event) => setApiMethod(event.target.value as HttpMethod)}
                    className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 font-mono-data text-xs text-zinc-100 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/30"
                    data-testid="select-api-tester-method"
                  >
                    {HTTP_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="api-context w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 font-mono-data text-[10px] leading-4 text-zinc-500">
                    <span className="text-primary">POST /api/api-tester/execute</span>
                    <span className="mt-0.5 block">Requests run through the API. Credentials are not stored.</span>
                  </div>
                </div>
              </div>

              <JsonTextarea
                id="api-tester-headers"
                label="Headers JSON"
                value={headersJson}
                onChange={setHeadersJson}
                placeholder={'{\n  "Authorization": "Bearer ..."\n}'}
                error={apiFieldErrors.headers}
                testId="textarea-api-tester-headers"
              />
              <JsonTextarea
                id="api-tester-body"
                label="Body JSON"
                value={bodyJson}
                onChange={setBodyJson}
                placeholder={'{\n  "query": "status"\n}'}
                error={apiFieldErrors.body}
                testId="textarea-api-tester-body"
              />

              <button
                type="submit"
                disabled={apiMutation.isPending}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary px-4 font-mono-data text-[11px] font-medium uppercase tracking-[0.16em] text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="button-execute-api-tester"
              >
                {apiMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {apiMutation.isPending ? 'Executing' : 'Execute'}
              </button>

              {apiError && <RequestError message={apiError} testId="error-api-tester-request" />}
              {apiResponse && <ApiResponse response={apiResponse} />}
              {!apiResponse && !apiError && !apiMutation.isPending && <EmptyResult icon={<Braces className="h-4 w-4" />} text="Response payload will appear here after execution." />}
              {apiMutation.isPending && <LoadingResult text="Waiting for response" />}
            </form>
          </Panel>

          <Panel className="api-tool-panel border-zinc-800/90 bg-zinc-950/45">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-accent/25 bg-accent/10 text-accent">
                  <FileJson className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-mono-data text-[10px] uppercase tracking-[0.18em] text-zinc-500">Extract / media</p>
                  <h3 className="mt-1 text-base font-semibold text-zinc-100">Media Scraper</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">Queue a media extraction job.</p>
                </div>
              </div>
              <span className="font-mono-data text-[10px] uppercase tracking-[0.14em] text-zinc-600">JOB</span>
            </div>

            <form className="space-y-4 p-5" onSubmit={extractMedia} noValidate>
              <div>
                <label htmlFor="media-scraper-url" className="mb-1.5 block font-mono-data text-[10px] uppercase tracking-[0.15em] text-zinc-400">Social URL</label>
                <div className="relative">
                  <input
                    id="media-scraper-url"
                    type="url"
                    value={mediaUrl}
                    onChange={(event) => {
                      setMediaUrl(event.target.value);
                      if (mediaUrlError) setMediaUrlError(null);
                    }}
                    placeholder="https://www.instagram.com/p/..."
                    className={`${fieldClass(Boolean(mediaUrlError))} pr-10`}
                    data-testid="input-media-scraper-url"
                  />
                  <ExternalLink className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-zinc-600" />
                </div>
                {mediaUrlError
                  ? <FieldError message={mediaUrlError} testId="error-media-scraper-url" />
                  : <p className="mt-1.5 text-[11px] leading-4 text-zinc-500">Supported providers: TikTok, Instagram, Reddit, and X.</p>}
              </div>

              <button
                type="submit"
                disabled={mediaMutation.isPending}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent px-4 font-mono-data text-[11px] font-medium uppercase tracking-[0.16em] text-accent-foreground transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="button-extract-media"
              >
                {mediaMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {mediaMutation.isPending ? 'Running' : 'Extract'}
              </button>

              {mediaError && <RequestError message={mediaError} testId="error-media-scraper-request" />}
              {mediaResult && <MediaResult result={mediaResult} />}
              {!mediaResult && !mediaError && !mediaMutation.isPending && <EmptyResult icon={<FileJson className="h-4 w-4" />} text="Job status appears here." />}
              {mediaMutation.isPending && <LoadingResult text="Submitting job" />}
            </form>
          </Panel>
        </div>
      </Panel>
    </section>
  );
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type ApiFieldErrors = { url?: string; headers?: string; body?: string };

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const SUPPORTED_SOCIAL_DOMAINS = ['tiktok.com', 'instagram.com', 'reddit.com', 'x.com', 'twitter.com'];

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseHeaders(value: string): { value?: Record<string, string>; error?: string } {
  if (!value.trim()) return { value: undefined };
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { error: 'Headers must be a JSON object with string values.' };
    }
    const entries = Object.entries(parsed);
    if (entries.some(([, headerValue]) => typeof headerValue !== 'string')) {
      return { error: 'Each header value must be a string.' };
    }
    return { value: parsed as Record<string, string> };
  } catch {
    return { error: 'Headers must be valid JSON.' };
  }
}

function validateSocialUrl(value: string): string | null {
  if (!value) return 'Enter a social media URL.';
  if (!isHttpUrl(value)) return 'Use a valid http:// or https:// URL.';
  const hostname = new URL(value).hostname.toLowerCase();
  const isSupported = SUPPORTED_SOCIAL_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  return isSupported ? null : 'Use a TikTok, Instagram, Reddit, or X URL.';
}

function getApiErrorMessage(error: unknown): string {
  const candidate = error as { status?: unknown; data?: unknown; message?: unknown };
  if (candidate.status === 501) {
    return 'The API tester is available, but this upstream provider is not configured on the command server yet.';
  }
  return getErrorMessage(error, 'The request could not be completed.');
}

function getMediaErrorMessage(error: unknown): string {
  const candidate = error as { status?: unknown };
  if (candidate.status === 501) {
    return 'Media extraction is not configured for this environment yet. The provider connection must be added on the command server before jobs can run.';
  }
  return getErrorMessage(error, 'The media extraction request could not be completed.');
}

function getErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as { data?: unknown; message?: unknown };
  if (typeof candidate.message === 'string' && candidate.message.trim()) return candidate.message;
  if (typeof candidate.data === 'string' && candidate.data.trim()) return candidate.data;
  if (candidate.data && typeof candidate.data === 'object' && 'error' in candidate.data) {
    const errorText = (candidate.data as { error?: unknown }).error;
    if (typeof errorText === 'string' && errorText.trim()) return errorText;
  }
  return fallback;
}

function fieldClass(hasError: boolean) {
  return `h-10 w-full rounded-md border bg-zinc-900 px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:ring-1 ${
    hasError ? 'border-destructive focus:border-destructive focus:ring-destructive/30' : 'border-zinc-700 focus:border-primary focus:ring-primary/30'
  }`;
}

function FieldError({ message, testId }: { message: string; testId: string }) {
  return <p className="mt-1.5 text-[11px] leading-4 text-red-300" data-testid={testId}>{message}</p>;
}

function JsonTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  testId,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
  testId: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-mono-data text-[10px] uppercase tracking-[0.15em] text-zinc-400">{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className={`min-h-24 w-full resize-y rounded-md border bg-zinc-900 px-3 py-2.5 font-mono-data text-[11px] leading-5 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:ring-1 ${
          error ? 'border-destructive focus:border-destructive focus:ring-destructive/30' : 'border-zinc-700 focus:border-primary focus:ring-primary/30'
        }`}
        data-testid={testId}
      />
      {error && <FieldError message={error} testId={`error-${testId.replace('textarea-', '')}`} />}
    </div>
  );
}

function RequestError({ message, testId }: { message: string; testId: string }) {
  return (
    <div className="rounded-md border border-red-500/25 bg-red-500/5 px-3 py-2.5 text-xs leading-5 text-red-200" role="alert" data-testid={testId}>
      {message}
    </div>
  );
}

function EmptyResult({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed border-zinc-800 px-3 py-3 text-xs text-zinc-500" data-testid="empty-workspace-result">
      <span className="text-zinc-600">{icon}</span>
      {text}
    </div>
  );
}

function LoadingResult({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-3 font-mono-data text-[11px] text-zinc-400" role="status" data-testid="loading-workspace-result">
      <LoaderCircle className="h-3.5 w-3.5 animate-spin text-primary" />
      {text}
    </div>
  );
}

function ApiResponse({ response }: { response: ApiTesterResponse }) {
  const responseBody = getResponseBody(response);
  const statusTone = response.status >= 200 && response.status < 400 ? 'text-primary' : 'text-red-300';
  return (
    <div className="api-result space-y-2.5 border-t border-zinc-800 pt-4" data-testid="api-tester-response">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono-data text-[10px] uppercase tracking-[0.15em] text-zinc-500">Upstream response</p>
        <div className="flex items-center gap-3 font-mono-data text-[10px] uppercase tracking-[0.12em]">
          <span className={statusTone} data-testid="status-api-tester-response">HTTP {response.status} {response.status_text}</span>
          <span className="inline-flex items-center gap-1 text-zinc-500"><Clock3 className="h-3 w-3" /> {response.elapsed_ms} ms</span>
        </div>
      </div>
      <HighlightedJson value={responseBody} />
    </div>
  );
}

function MediaResult({ result }: { result: MediaExtractResponse }) {
  return (
    <div className="api-result space-y-3 border-t border-zinc-800 pt-4" data-testid="media-scraper-result">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <p className="font-mono-data text-[10px] uppercase tracking-[0.15em] text-primary">Job accepted</p>
        <span className="ml-auto rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono-data text-[10px] uppercase text-primary">{result.status}</span>
      </div>
      <div className="rounded-md border border-zinc-800 bg-zinc-900/70 p-3">
        <p className="text-sm leading-5 text-zinc-200">{result.message}</p>
        <dl className="mt-3 grid gap-2 border-t border-zinc-800 pt-3 text-xs sm:grid-cols-2">
          <div><dt className="font-mono-data text-[10px] uppercase tracking-[0.12em] text-zinc-600">Platform</dt><dd className="mt-1 uppercase text-zinc-300">{result.platform}</dd></div>
          <div><dt className="font-mono-data text-[10px] uppercase tracking-[0.12em] text-zinc-600">Job ID</dt><dd className="mt-1 break-all font-mono-data text-zinc-300">{result.job_id ?? 'Not assigned'}</dd></div>
        </dl>
      </div>
    </div>
  );
}

function getResponseBody(response: ApiTesterResponse): unknown {
  if (response.body !== null && response.body !== undefined) return response.body;
  return response.body_text || '';
}

function HighlightedJson({ value }: { value: unknown }) {
  const serialized = typeof value === 'string'
    ? tryFormatJson(value)
    : JSON.stringify(value, null, 2);
  const safeText = serialized ?? '';
  const escaped = safeText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const highlighted = escaped.replace(
    /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (token, key, string, bool, number) => {
      if (key) return `<span class="text-amber-300">${key}</span>`;
      if (string) return `<span class="text-emerald-300">${string}</span>`;
      if (bool) return `<span class="text-cyan-300">${bool}</span>`;
      if (number) return `<span class="text-sky-300">${number}</span>`;
      return token;
    },
  );
  return <pre className="max-h-72 overflow-auto rounded-md border border-zinc-800 bg-[hsl(240_8%_6%)] p-3 font-mono-data text-[11px] leading-5 text-zinc-300" data-testid="json-api-tester-response" dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

function tryFormatJson(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
