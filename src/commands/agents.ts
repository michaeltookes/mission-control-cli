import { Command } from "commander";
import { request } from "../client.js";
import { resolveOrg } from "../config.js";
import { printJson, exitWith } from "../output.js";

const AGENT_STATUSES = new Set(["active", "idle", "offline", "retired"]);

export function registerAgents(program: Command): void {
  const cmd = program.command("agents").description("Agent operations");

  cmd
    .command("list")
    .description("List agents")
    .option("-o, --org <slug>", "Org slug")
    .option("--role <role>", "Filter by role")
    .option("--department <dept>", "Filter by department")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const data = await request(`/api/org/${org}/agents`, {
          query: { role: opts.role, department: opts.department },
        });
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });

  cmd
    .command("update-status")
    .description("Update an agent's status")
    .requiredOption("--id <uuid>", "Agent UUID")
    .requiredOption("--status <status>", "active | idle | offline | retired")
    .option("-o, --org <slug>", "Org slug")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        if (!AGENT_STATUSES.has(opts.status)) {
          throw new Error(
            `Invalid agent status: ${opts.status}. Allowed: active, idle, offline, retired.`,
          );
        }
        const org = resolveOrg(opts.org);
        const data = await request(`/api/org/${org}/agents/${opts.id}`, {
          method: "PATCH",
          body: { status: opts.status },
        });
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });
}
