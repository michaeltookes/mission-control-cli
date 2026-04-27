import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Command } from "commander";
import { registerHeartbeat } from "../src/commands/heartbeat.js";
import { setValue } from "../src/config.js";

let dir: string;
let originalFetch: typeof fetch;
let originalWrite: typeof process.stdout.write;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "mc-cli-heartbeat-"));
  process.env.MC_CONFIG_PATH = path.join(dir, "config.json");
  setValue("api-url", "https://example.test");
  setValue("api-key", "test-key");
  originalFetch = globalThis.fetch;
  originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (() => true) as typeof process.stdout.write;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.stdout.write = originalWrite;
  delete process.env.MC_CONFIG_PATH;
  rmSync(dir, { recursive: true, force: true });
});

describe("heartbeat", () => {
  it("includes schemaVersion: 1.0 in the request body", async () => {
    let seenBody: Record<string, unknown> | null = null;
    globalThis.fetch = vi.fn(async (_input: any, init: any = {}) => {
      seenBody = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ data: { ok: true }, error: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const program = new Command();
    registerHeartbeat(program);
    await program.parseAsync(
      ["node", "mc", "heartbeat", "--agent", "lucius-fox", "--org", "coding-lab"],
    );

    expect(seenBody).not.toBeNull();
    expect(seenBody!.schemaVersion).toBe("1.0");
    expect(seenBody!.agentId).toBe("lucius-fox");
  });
});
