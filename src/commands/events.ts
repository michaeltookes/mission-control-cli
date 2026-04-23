import { Command } from "commander";
import { request } from "../client.js";
import { resolveOrg } from "../config.js";
import { printJson, exitWith } from "../output.js";

export function registerEvents(program: Command): void {
  program
    .command("events")
    .description("Query the event log")
    .option("-o, --org <slug>", "Org slug")
    .option("--type <type>", "Filter by event type")
    .option("--actor <slug>", "Filter by actor")
    .option("--since <iso>", "Only events at or after this ISO timestamp")
    .option("--until <iso>", "Only events strictly before this ISO timestamp")
    .option("--limit <n>", "Limit results", parseLimit)
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const data = await request(`/api/org/${org}/events`, {
          query: {
            type: opts.type,
            actor: opts.actor,
            since: opts.since,
            until: opts.until,
            limit: opts.limit,
          },
        });
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });
}

function parseLimit(value: string): number {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) throw new Error(`Invalid limit: ${value}`);
  return n;
}
