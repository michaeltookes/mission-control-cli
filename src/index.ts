import { Command } from "commander";
import { fileURLToPath } from "node:url";
import { registerHeartbeat } from "./commands/heartbeat.js";
import { registerStatus } from "./commands/status.js";
import { registerAgents } from "./commands/agents.js";
import { registerTasks } from "./commands/tasks.js";
import { registerProjects } from "./commands/projects.js";
import { registerBacklog } from "./commands/backlog.js";
import { registerEvents } from "./commands/events.js";
import { registerTail } from "./commands/tail.js";
import { registerConfig } from "./commands/config.js";
import { registerCompletions } from "./commands/completions.js";

export function createProgram(): Command {
  const program = new Command();
  program
    .name("mc")
    .description("Mission Control CLI — agent ops against genkeilabs.dev")
    .version("0.1.0");

  registerHeartbeat(program);
  registerStatus(program);
  registerAgents(program);
  registerTasks(program);
  registerProjects(program);
  registerBacklog(program);
  registerEvents(program);
  registerTail(program);
  registerConfig(program);
  registerCompletions(program);

  return program;
}

const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const program = createProgram();
  program.parseAsync(process.argv).catch((err) => {
    process.stderr.write(`fatal: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
