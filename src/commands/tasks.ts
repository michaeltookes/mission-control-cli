import { Command } from "commander";
import { request } from "../client.js";
import { resolveOrg } from "../config.js";
import { printJson, exitWith } from "../output.js";
import { stripUndefined } from "../utils.js";

const TASK_PRIORITIES = new Set(["P0", "P1", "P2"]);

function parseTaskPriority(value: string): string {
  if (!TASK_PRIORITIES.has(value)) {
    throw new Error(`Invalid priority: ${value}. Allowed: P0, P1, P2.`);
  }
  return value;
}

export function registerTasks(program: Command): void {
  const cmd = program.command("tasks").description("Task operations");

  cmd
    .command("list")
    .description("List tasks")
    .option("-o, --org <slug>", "Org slug")
    .option("--status <status>", "Filter by status (e.g. in-progress, backlog)")
    .option("--priority <priority>", "Filter by priority (P0, P1, P2)", parseTaskPriority)
    .option("--owner <slug>", "Filter by owner agent slug")
    .option("--project <slug>", "Filter by project slug")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const data = await request(`/api/org/${org}/tasks`, {
          query: {
            status: opts.status,
            priority: opts.priority,
            owner: opts.owner,
            project: opts.project,
          },
        });
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });

  cmd
    .command("get")
    .description("Fetch one task")
    .requiredOption("--id <uuid>", "Task UUID")
    .option("-o, --org <slug>", "Org slug")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const data = await request(`/api/org/${org}/tasks/${opts.id}`);
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });

  cmd
    .command("create")
    .description("Create a new task")
    .requiredOption("--title <title>", "Task title")
    .option("--priority <priority>", "P0 | P1 | P2", parseTaskPriority)
    .option("--status <status>", "Initial status")
    .option("--owner <slug>", "Owner agent slug")
    .option("--department <dept>", "Department")
    .option("--task-code <code>", "Explicit task code (e.g. TSK-042)")
    .option("--deliverable <text>", "Deliverable / description")
    .option("--project-id <uuid>", "Project UUID")
    .option("-o, --org <slug>", "Org slug")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const body = stripUndefined({
          title: opts.title,
          priority: opts.priority ?? "P2",
          status: opts.status,
          owner: opts.owner,
          department: opts.department,
          taskCode: opts.taskCode,
          deliverable: opts.deliverable,
          projectId: opts.projectId,
        });
        const data = await request(`/api/org/${org}/tasks`, {
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
    .description("Update a task")
    .requiredOption("--id <uuid>", "Task UUID")
    .option("--title <title>")
    .option("--status <status>")
    .option("--priority <priority>", "P0 | P1 | P2", parseTaskPriority)
    .option("--owner <slug>")
    .option("--department <dept>")
    .option("--deliverable <text>")
    .option("-o, --org <slug>", "Org slug")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const body = stripUndefined({
          title: opts.title,
          status: opts.status,
          priority: opts.priority,
          owner: opts.owner,
          department: opts.department,
          deliverable: opts.deliverable,
        });
        if (Object.keys(body).length === 0) {
          throw new Error("Provide at least one field to update");
        }
        const data = await request(`/api/org/${org}/tasks/${opts.id}`, {
          method: "PATCH",
          body,
        });
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });

  cmd
    .command("claim")
    .description("Atomically claim a task for an owner")
    .requiredOption("--id <uuid>", "Task UUID")
    .requiredOption("--owner <slug>", "Owner agent slug")
    .option("-o, --org <slug>", "Org slug")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const data = await request(`/api/org/${org}/tasks/${opts.id}/claim`, {
          method: "POST",
          body: { owner: opts.owner },
        });
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });
}
