import { resolveApiKey, resolveApiUrl } from "./config.js";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
}

export interface ApiSuccess<T> {
  data: T;
  error: null;
  meta?: Record<string, unknown> | null;
}

export interface ApiFailure {
  data: null;
  error: string;
  meta?: Record<string, unknown> | null;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T = unknown>(
  pathname: string,
  options: RequestOptions = {},
): Promise<T> {
  const baseUrl = resolveApiUrl();
  const apiKey = resolveApiKey();
  const url = new URL(pathname.startsWith("/") ? pathname : `/${pathname}`, baseUrl);

  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload: unknown = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const message = extractError(payload) ?? `HTTP ${res.status} ${res.statusText}`;
    throw new ApiError(message, res.status, payload);
  }

  if (isJson && payload && typeof payload === "object" && "data" in payload) {
    const wrapped = payload as ApiResponse<T>;
    if (wrapped.error) {
      throw new ApiError(wrapped.error, res.status, wrapped);
    }
    return wrapped.data as T;
  }

  return payload as T;
}

function extractError(payload: unknown): string | undefined {
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.message === "string") return obj.message;
  }
  return undefined;
}
