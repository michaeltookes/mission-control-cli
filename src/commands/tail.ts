import { Command } from "commander";
import pc from "picocolors";
import { request, ApiError } from "../client.js";
import { resolveOrg, loadConfig } from "../config.js";
import { exitWith } from "../output.js";

interface EventRecord {
  id?: string;
  type?: string;
  actor?: string | null;
  department?: string | null;
  timestamp?: string;
  payload?: unknown;
}

const SEEN_WINDOW = 500;

export function registerTail(program: Command): void {
  program
    .command("tail")
    .description("Tail the event log (polls every <interval> seconds)")
    .option("-o, --org <slug>", "Org slug")
    .option("--filter <types>", "Comma-separated event types to include")
    .option("--since <iso>", "Start at ISO timestamp instead of now")
    .option("--interval <seconds>", "Poll interval in seconds (1-30)", parseInterval)
    .option("--json", "Emit one JSON object per line")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const interval = clampInterval(
          opts.interval ?? configuredInterval() ?? 2,
        );
        const filter = parseFilter(opts.filter);
        await runTail({
          org,
          interval,
          filter,
          since: opts.since,
          json: Boolean(opts.json),
        });
      } catch (err) {
        exitWith(err);
      }
    });
}

interface TailOptions {
  org: string;
  interval: number;
  filter: Set<string> | null;
  since?: string;
  json: boolean;
  fetchPage?: typeof request;
  signal?: AbortSignal;
  maxIterations?: number;
}

export async function runTail(options: TailOptions): Promise<void> {
  const fetchPage = options.fetchPage ?? request;
  const seen = new Set<string>();
  const seenOrder: string[] = [];

  let cursor = options.since ?? new Date().toISOString();
  let backoffMs = 0;
  let iterations = 0;
  const limit = options.maxIterations ?? Number.POSITIVE_INFINITY;

  installSigintHandler();

  while (iterations < limit) {
    iterations++;
    try {
      const events = await fetchPage<EventRecord[]>(
        `/api/org/${options.org}/events`,
        { query: { since: cursor, limit: 200 }, signal: options.signal },
      );
      backoffMs = 0;

      const fresh = Array.isArray(events)
        ? events.filter((e) => {
            const id = e.id ?? `${e.timestamp}-${e.type}`;
            if (!id || seen.has(id)) return false;
            return true;
          })
        : [];

      fresh.sort((a, b) => {
        const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
        const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
        return ta - tb;
      });

      for (const ev of fresh) {
        const id = ev.id ?? `${ev.timestamp}-${ev.type}`;
        if (id) {
          seen.add(id);
          seenOrder.push(id);
          while (seenOrder.length > SEEN_WINDOW) {
            const drop = seenOrder.shift();
            if (drop) seen.delete(drop);
          }
        }
        if (ev.timestamp && ev.timestamp > cursor) cursor = ev.timestamp;
        if (options.filter && ev.type && !options.filter.has(ev.type)) continue;
        emit(ev, options.json);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw err;
      }
      backoffMs = Math.min(30_000, backoffMs ? backoffMs * 2 : 1_000);
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        pc.yellow(`tail: ${msg} — retrying in ${backoffMs / 1000}s\n`),
      );
      await sleep(backoffMs, options.signal);
      continue;
    }

    await sleep(options.interval * 1000, options.signal);
  }
}

function emit(ev: EventRecord, json: boolean): void {
  if (json) {
    process.stdout.write(JSON.stringify(ev) + "\n");
    return;
  }
  const t = ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : "--:--:--";
  const type = (ev.type ?? "?").padEnd(20);
  const actor = ev.actor ?? "-";
  process.stdout.write(`${pc.dim(`[${t}]`)} ${pc.cyan(type)} ${actor}\n`);
}

function parseFilter(value: string | undefined): Set<string> | null {
  if (!value) return null;
  const set = new Set(
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return set.size > 0 ? set : null;
}

function parseInterval(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`Invalid interval: ${raw}`);
  return n;
}

function clampInterval(n: number): number {
  if (n < 1) return 1;
  if (n > 30) return 30;
  return n;
}

function configuredInterval(): number | undefined {
  const cfg = loadConfig();
  const v = cfg["tail-interval"];
  return typeof v === "number" ? v : undefined;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new Error("aborted"));
      },
      { once: true },
    );
  });
}

let sigintInstalled = false;
function installSigintHandler(): void {
  if (sigintInstalled) return;
  sigintInstalled = true;
  process.on("SIGINT", () => {
    process.stderr.write("\n");
    process.exit(0);
  });
}
