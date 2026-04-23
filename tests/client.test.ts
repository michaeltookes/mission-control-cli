import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { request, ApiError } from "../src/client.js";
import { setValue } from "../src/config.js";

let dir: string;
let originalFetch: typeof fetch;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "mc-cli-client-"));
  process.env.MC_CONFIG_PATH = path.join(dir, "config.json");
  setValue("api-url", "https://example.test");
  setValue("api-key", "test-key");
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.MC_CONFIG_PATH;
  rmSync(dir, { recursive: true, force: true });
});

function mockFetch(impl: (url: URL, init: RequestInit) => Response | Promise<Response>): void {
  globalThis.fetch = vi.fn(async (input: any, init: any = {}) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(String(input)) : new URL(input.url);
    return impl(url, init);
  }) as typeof fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("client", () => {
  it("sends Authorization: Bearer <api-key>", async () => {
    let seenAuth: string | null = null;
    mockFetch((_url, init) => {
      const headers = init.headers as Record<string, string>;
      seenAuth = headers["Authorization"];
      return jsonResponse({ data: { ok: true }, error: null });
    });
    await request("/api/test");
    expect(seenAuth).toBe("Bearer test-key");
  });

  it("unwraps { data, error } envelope", async () => {
    mockFetch(() => jsonResponse({ data: { hello: "world" }, error: null }));
    const result = await request<{ hello: string }>("/api/test");
    expect(result).toEqual({ hello: "world" });
  });

  it("throws ApiError when envelope contains an error", async () => {
    mockFetch(() => jsonResponse({ data: null, error: "Validation failed" }, 400));
    await expect(request("/api/test")).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "Validation failed",
    });
  });

  it("throws ApiError on non-2xx responses", async () => {
    mockFetch(() => jsonResponse({ error: "Not found" }, 404));
    await expect(request("/api/test")).rejects.toBeInstanceOf(ApiError);
  });

  it("appends query params and skips undefined", async () => {
    let seenUrl = "";
    mockFetch((url) => {
      seenUrl = url.toString();
      return jsonResponse({ data: [], error: null });
    });
    await request("/api/x", { query: { a: "1", b: undefined, c: 2 } });
    expect(seenUrl).toContain("a=1");
    expect(seenUrl).toContain("c=2");
    expect(seenUrl).not.toContain("b=");
  });

  it("serializes JSON body and sets Content-Type", async () => {
    let seenBody: string | undefined;
    let seenContentType: string | undefined;
    mockFetch((_url, init) => {
      seenBody = init.body as string;
      const headers = init.headers as Record<string, string>;
      seenContentType = headers["Content-Type"];
      return jsonResponse({ data: { ok: true }, error: null });
    });
    await request("/api/x", { method: "POST", body: { foo: "bar" } });
    expect(seenBody).toBe('{"foo":"bar"}');
    expect(seenContentType).toBe("application/json");
  });
});
