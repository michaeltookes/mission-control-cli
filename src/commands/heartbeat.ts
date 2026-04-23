import { Command } from "commander";
import { request } from "../client.js";
import { resolveOrg } from "../config.js";
import { printJson, exitWith } from "../output.js";

export function registerHeartbeat(program: Command): void {
  program
    .command("heartbeat")
    .description("Register a presence heartbeat for an agent")
    .requiredOption("-a, --agent <slug>", "Agent slug (e.g. lucius-fox)")
    .option("-o, --org <slug>", "Org slug (overrides default)")
    .option("--session-id <id>", "Optional session identifier")
    .option("--status-hint <hint>", "Free-form status (e.g. working, idle)")
    .option("--model <name>", "Model identifier; if changed, syncs agents.model")
    .option("--context-tokens <n>", "Context tokens used", asInt)
    .option("--output-tokens <n>", "Output tokens generated", asInt)
    .option("--idempotency-key <key>", "Optional idempotency key")
    .option("--json", "Compact JSON output")
    .action(async (opts) => {
      try {
        const org = resolveOrg(opts.org);
        const body = {
          agentId: opts.agent,
          timestamp: new Date().toISOString(),
          sessionId: opts.sessionId,
          statusHint: opts.statusHint,
          model: opts.model,
          contextTokens: opts.contextTokens,
          outputTokens: opts.outputTokens,
          idempotencyKey: opts.idempotencyKey,
        };
        const data = await request(`/api/org/${org}/agents/heartbeat`, {
          method: "POST",
          body,
        });
        printJson(data, { json: opts.json });
      } catch (err) {
        exitWith(err);
      }
    });
}

function asInt(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`Expected non-negative integer, got: ${value}`);
  }
  return n;
}
