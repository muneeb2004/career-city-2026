const JSON_MIME_PATTERN = /application\/json/i;

export async function fetchJson<T>(input: RequestInfo | URL, init: RequestInit | undefined, fallbackError: string): Promise<T> {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";
  const expectsJson = JSON_MIME_PATTERN.test(contentType);

  let payload: unknown = null;

  if (expectsJson) {
    payload = await response.json().catch(() => ({}));
  } else if (response.status !== 204) {
    payload = await response.text().catch(() => "");
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? (payload as { error?: string }).error
        : null;

    throw new Error(message && message.trim() ? message : fallbackError);
  }

  return (payload ?? ({} as unknown)) as T;
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallback;
}
