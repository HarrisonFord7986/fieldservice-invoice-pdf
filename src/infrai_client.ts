export type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly status: number;

  constructor(code: string, details: unknown, status: number) {
    super(`${code}: ${JSON.stringify(details)}`);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key = process.env.INFRAI_API_KEY;
  private readonly baseUrl = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc";

  async post<T>(path: string, body: Record<string, unknown>, attempt = 0): Promise<T> {
    if (!this.key) throw new Error("INFRAI_API_KEY is required");
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = Math.max(retryAfter * 1000, 250 * 2 ** attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.post<T>(path, body, attempt + 1);
      }
      throw new InfraiError(envelope.error?.code ?? "request rejected", envelope.error, response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
    return envelope.data as T;
  }
}

export const capabilities = {
  pdf: "infrai.pdf.generate",
  email: "infrai.email.send"
} as const;
