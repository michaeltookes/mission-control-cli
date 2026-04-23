import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runTail } from "../src/commands/tail.js";
import { setValue } from "../src/config.js";

let dir: string;
let stdoutCalls: string[];
let originalWrite: typeof process.stdout.write;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "mc-cli-tail-"));
  process.env.MC_CONFIG_PATH = path.join(dir, "config.json");
  setValue("api-url", "https://example.test");
  setValue("api-key", "k");
  stdoutCalls = [];
  originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: unknown) => {
    stdoutCalls.push(typeof chunk === "string" ? chunk : String(chunk));
    return true;
  }) as typeof process.stdout.write;
});

afterEach(() => {
  process.stdout.write = originalWrite;
  delete process.env.MC_CONFIG_PATH;
  rmSync(dir, { recursive: true, force: true });
});

describe("tail", () => {
  it("dedupes events by id across polls", async () => {
    const pages = [
      [
        { id: "1", type: "task.claimed", actor: "a", timestamp: "2026-04-22T10:00:00.000Z" },
        { id: "2", type: "task.updated", actor: "b", timestamp: "2026-04-22T10:00:01.000Z" },
      ],
      [
        // server returns the same events again (e.g. since-cursor overlap)
        { id: "2", type: "task.updated", actor: "b", timestamp: "2026-04-22T10:00:01.000Z" },
        { id: "3", type: "agent.heartbeat", actor: "c", timestamp: "2026-04-22T10:00:02.000Z" },
      ],
    ];
    let call = 0;
    const fetchPage = vi.fn(async () => pages[call++] ?? []);

    await runTail({
      org: "coding-lab",
      interval: 0,
      filter: null,
      json: true,
      fetchPage: fetchPage as never,
      maxIterations: 2,
    });

    const lines = stdoutCalls;
    const ids = lines.map((l) => JSON.parse(l).id).sort();
    expect(ids).toEqual(["1", "2", "3"]);
  });

  it("applies --filter to event types", async () => {
    const fetchPage = vi.fn(async () => [
      { id: "1", type: "task.claimed", timestamp: "2026-04-22T10:00:00.000Z" },
      { id: "2", type: "agent.heartbeat", timestamp: "2026-04-22T10:00:01.000Z" },
    ]);

    await runTail({
      org: "coding-lab",
      interval: 0,
      filter: new Set(["task.claimed"]),
      json: true,
      fetchPage: fetchPage as never,
      maxIterations: 1,
    });

    const lines = stdoutCalls;
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).type).toBe("task.claimed");
  });

  it("advances cursor and dedupe state for filtered-out events", async () => {
    const seenSince: string[] = [];
    const fetchPage = vi.fn(async (_path: string, init?: { query?: { since?: string } }) => {
      const since = init?.query?.since ?? "";
      seenSince.push(since);
      if (since === "2026-04-22T09:59:59.000Z") {
        return [
          { id: "1", type: "agent.heartbeat", timestamp: "2026-04-22T10:00:00.000Z" },
        ];
      }
      if (since === "2026-04-22T10:00:00.000Z") {
        return [
          { id: "2", type: "task.claimed", timestamp: "2026-04-22T10:00:01.000Z" },
        ];
      }
      return [];
    });

    await runTail({
      org: "coding-lab",
      interval: 0,
      filter: new Set(["task.claimed"]),
      since: "2026-04-22T09:59:59.000Z",
      json: true,
      fetchPage: fetchPage as never,
      maxIterations: 2,
    });

    expect(seenSince).toEqual([
      "2026-04-22T09:59:59.000Z",
      "2026-04-22T10:00:00.000Z",
    ]);
    expect(stdoutCalls).toHaveLength(1);
    expect(JSON.parse(stdoutCalls[0]).id).toBe("2");
  });

  it("emits human-readable lines when --json is off", async () => {
    const fetchPage = vi.fn(async () => [
      { id: "1", type: "task.claimed", actor: "lucius", timestamp: "2026-04-22T10:00:00.000Z" },
    ]);

    await runTail({
      org: "coding-lab",
      interval: 0,
      filter: null,
      json: false,
      fetchPage: fetchPage as never,
      maxIterations: 1,
    });

    const lines = stdoutCalls;
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/task\.claimed/);
    expect(lines[0]).toMatch(/lucius/);
  });
});
