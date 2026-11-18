/**
 * Client-side request helper for /api/vault/* that keeps the HTTP status and
 * error code (apiFetch only keeps the message), so the editor can tell a
 * title conflict (409) from a network failure.
 */
export class VaultRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string | null,
  ) {
    super(message);
    this.name = "VaultRequestError";
  }
}

export async function vaultFetch<T>(
  url: string,
  init?: { method?: string; json?: unknown; signal?: AbortSignal },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? (init?.json !== undefined ? "POST" : "GET"),
      headers: init?.json !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.json !== undefined ? JSON.stringify(init.json) : undefined,
      signal: init?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new VaultRequestError(
      "You appear to be offline. Your changes are kept here — try again when you're connected.",
      0,
      "network",
    );
  }
  const data = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  } & T;
  if (!res.ok)
    throw new VaultRequestError(
      data.error?.message ?? `Request failed (${res.status}).`,
      res.status,
      data.error?.code ?? null,
    );
  return data;
}
