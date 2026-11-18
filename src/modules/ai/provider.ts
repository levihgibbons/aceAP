/**
 * AI tutor provider abstraction.
 *
 * The tutor talks to a `TutorProvider`, never to a vendor SDK directly, so the
 * provider can be swapped (or faked in tests) without touching tutor policy.
 * Today the only real implementation is Anthropic's Messages API, enabled when
 * AI_PROVIDER=anthropic and ANTHROPIC_API_KEY is set. The key is read from the
 * environment on the server only and is never returned by any function here.
 */
import Anthropic, { APIConnectionTimeoutError, APIError, AuthenticationError, PermissionDeniedError, RateLimitError } from "@anthropic-ai/sdk";

export interface TutorMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TutorCompletionRequest {
  system: string;
  messages: TutorMessage[];
  maxOutputTokens: number;
  timeoutMs: number;
}

export interface TutorCompletion {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface TutorProvider {
  /** Stable provider id recorded in ai_usage, e.g. "anthropic". */
  readonly id: string;
  /** Model id recorded in ai_usage. */
  readonly model: string;
  complete(req: TutorCompletionRequest): Promise<TutorCompletion>;
}

export type TutorProviderErrorKind = "timeout" | "rate_limited" | "auth" | "bad_request" | "unavailable" | "unknown";

/** A provider failure with a coarse, loggable kind (no message content). */
export class TutorProviderError extends Error {
  constructor(
    public readonly kind: TutorProviderErrorKind,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "TutorProviderError";
  }
}

export interface TutorStatus {
  configured: boolean;
  provider: string | null;
  model: string | null;
  reason?: string;
}

export const DEFAULT_TUTOR_MODEL = "claude-sonnet-5-5";

function envInt(name: string, fallback: number, min: number, max: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.max(Math.round(n), min), max) : fallback;
}

/** Operational limits from the environment, clamped to sane ranges. */
export function tutorLimits(): { maxMessagesPerHour: number; maxOutputTokens: number; timeoutMs: number } {
  return {
    maxMessagesPerHour: envInt("AI_MAX_MESSAGES_PER_HOUR", 30, 1, 1000),
    maxOutputTokens: envInt("AI_MAX_OUTPUT_TOKENS", 700, 64, 4000),
    timeoutMs: envInt("AI_TIMEOUT_MS", 30_000, 1_000, 120_000),
  };
}

const configuredModel = () => process.env.AI_MODEL?.trim() || DEFAULT_TUTOR_MODEL;

/** Anthropic Messages API implementation. */
class AnthropicTutorProvider implements TutorProvider {
  readonly id = "anthropic";
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    // One retry for transient failures; the per-request timeout bounds total wait.
    this.client = new Anthropic({ apiKey, maxRetries: 1 });
  }

  async complete(req: TutorCompletionRequest): Promise<TutorCompletion> {
    try {
      const message = await this.client.messages.create(
        { model: this.model, max_tokens: req.maxOutputTokens, system: req.system, messages: req.messages },
        { timeout: req.timeoutMs, maxRetries: 1 },
      );
      const text = message.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim();
      return { text, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
    } catch (err) {
      throw toProviderError(err);
    }
  }
}

function toProviderError(err: unknown): TutorProviderError {
  if (err instanceof TutorProviderError) return err;
  if (err instanceof APIConnectionTimeoutError) return new TutorProviderError("timeout", "Provider request timed out.");
  if (err instanceof RateLimitError) return new TutorProviderError("rate_limited", "Provider rate limit reached.", 429);
  if (err instanceof AuthenticationError || err instanceof PermissionDeniedError) return new TutorProviderError("auth", "Provider rejected the credentials.", err.status);
  if (err instanceof APIError) {
    const status = typeof err.status === "number" ? err.status : undefined;
    return new TutorProviderError(status !== undefined && status >= 400 && status < 500 ? "bad_request" : "unavailable", "Provider request failed.", status);
  }
  return new TutorProviderError("unknown", "Provider call failed.");
}

// ───────────────────────────── provider lookup ──────────────────────────────

const store = globalThis as unknown as { __aceapTutorTestProvider?: TutorProvider | null; __aceapTutorProvider?: { key: string; provider: TutorProvider } };

/**
 * Tests only: inject a fake provider (or `null` to remove the override and go
 * back to environment configuration).
 */
export function setTutorProviderForTests(provider: TutorProvider | null): void {
  store.__aceapTutorTestProvider = provider ?? undefined;
}

/** The configured provider, or null when the tutor is not configured. */
export function getTutorProvider(): TutorProvider | null {
  if (store.__aceapTutorTestProvider) return store.__aceapTutorTestProvider;
  if ((process.env.AI_PROVIDER ?? "").trim().toLowerCase() !== "anthropic") return null;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  const model = configuredModel();
  const cacheKey = `${model}:${apiKey.length}:${apiKey.slice(-4)}`;
  if (store.__aceapTutorProvider?.key !== cacheKey) store.__aceapTutorProvider = { key: cacheKey, provider: new AnthropicTutorProvider(apiKey, model) };
  return store.__aceapTutorProvider.provider;
}

/** Whether the tutor can be used, for the UI's status badge. Never exposes the key. */
export function getTutorStatus(): TutorStatus {
  const injected = store.__aceapTutorTestProvider;
  if (injected) return { configured: true, provider: injected.id, model: injected.model };
  const provider = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  if (provider !== "anthropic") {
    return { configured: false, provider: null, model: null, reason: provider && provider !== "none" ? `Unsupported AI provider "${provider}".` : "The AI tutor hasn't been set up on this server." };
  }
  if (!process.env.ANTHROPIC_API_KEY?.trim()) return { configured: false, provider: "anthropic", model: configuredModel(), reason: "No API key is configured for the AI tutor." };
  return { configured: true, provider: "anthropic", model: configuredModel() };
}
