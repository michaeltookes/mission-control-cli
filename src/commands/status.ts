import { Command } from "commander";
import { request } from "../client.js";
import { resolveOrg } from "../config.js";
import { printJson, exitWith } from "../output.js";

export function registerStatus(program: Command): void {
  program
    .command("status")
    .description("Fetch org status snapshot")
    .option("-o, --org <slug>", "Org slug (overrides default)")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const data = await request(`/api/org/${encodeURIComponent(org)}/status`);
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });
}
