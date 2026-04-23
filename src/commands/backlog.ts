import { Command } from "commander";
import { request } from "../client.js";
import { resolveOrg } from "../config.js";
import { printJson, exitWith } from "../output.js";
import { stripUndefined, encodePathSegment } from "../utils.js";

const BACKLOG_PRIORITIES = new Set(["P0", "P1", "P2"]);

function parseBacklogPriority(value: string): string {
  if (!BACKLOG_PRIORITIES.has(value)) {
    throw new Error(`Invalid priority: ${value}. Allowed: P0, P1, P2.`);
  }
  return value;
}

export function registerBacklog(program: Command): void {
  const cmd = program.command("backlog").description("Backlog operations");

  cmd
    .command("add")
    .description("Add a single backlog item")
    .requiredOption("--title <title>", "Item title")
    .option("--priority <priority>", "P0 | P1 | P2", parseBacklogPriority, "P2")
    .option("--task-code <code>", "Explicit task code (e.g. TSK-042)")
    .option("--description <text>", "Description / deliverable")
    .option("--project-slug <slug>", "Project slug")
    .option("-o, --org <slug>", "Org slug")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const body = stripUndefined({
          title: opts.title,
          priority: opts.priority,
          taskCode: opts.taskCode,
          description: opts.description,
          projectSlug: opts.projectSlug,
        });
        const data = await request(`/api/org/${encodePathSegment(org)}/backlog`, {
          method: "POST",
          body,
        });
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });
}
