import { Command } from "commander";
import { request } from "../client.js";
import { resolveOrg } from "../config.js";
import { printJson, exitWith } from "../output.js";
import { stripUndefined, encodePathSegment } from "../utils.js";

export function registerProjects(program: Command): void {
  const cmd = program.command("projects").description("Project operations");

  cmd
    .command("list")
    .description("List projects")
    .option("-o, --org <slug>", "Org slug")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const data = await request(`/api/org/${encodePathSegment(org)}/projects`);
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });

  cmd
    .command("get")
    .description("Fetch one project")
    .requiredOption("--id <uuid>", "Project UUID")
    .option("-o, --org <slug>", "Org slug")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const data = await request(`/api/org/${encodePathSegment(org)}/projects/${opts.id}`);
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });

  cmd
    .command("create")
    .description("Create a new project")
    .requiredOption("--slug <slug>", "Project slug (kebab-case)")
    .requiredOption("--name <name>", "Display name")
    .option("--description <text>")
    .option("--parent-project-id <uuid>", "Parent project UUID")
    .option("-o, --org <slug>", "Org slug")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const encodedOrg = encodePathSegment(org);
        const body = stripUndefined({
          slug: opts.slug,
          name: opts.name,
          description: opts.description,
          parentProjectId: opts.parentProjectId,
        });
        const data = await request(`/api/org/${encodedOrg}/projects`, {
          method: "POST",
          body,
        });
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });

  cmd
    .command("update")
    .description("Update a project")
    .requiredOption("--id <uuid>", "Project UUID")
    .option("--name <name>")
    .option("--description <text>")
    .option("--status <status>")
    .option("--parent-project-id <uuid>")
    .option("-o, --org <slug>", "Org slug")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const encodedOrg = encodePathSegment(org);
        const body = stripUndefined({
          name: opts.name,
          description: opts.description,
          status: opts.status,
          parentProjectId: opts.parentProjectId,
        });
        if (Object.keys(body).length === 0) {
          throw new Error("Provide at least one field to update");
        }
        const data = await request(`/api/org/${encodedOrg}/projects/${opts.id}`, {
          method: "PATCH",
          body,
        });
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });
}
