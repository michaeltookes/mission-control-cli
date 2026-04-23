import { Command } from "commander";
import {
  loadConfig,
  setValue,
  getValue,
  deleteValue,
  configPath,
  type ConfigKey,
} from "../config.js";
import { printJson, exitWith } from "../output.js";

const KNOWN_KEYS: ConfigKey[] = [
  "api-url",
  "api-key",
  "default-org",
  "tail-interval",
];

function assertKey(key: string): asserts key is ConfigKey {
  if (!KNOWN_KEYS.includes(key as ConfigKey)) {
    throw new Error(`Unknown config key: ${key}. Valid: ${KNOWN_KEYS.join(", ")}`);
  }
}

export function registerConfig(program: Command): void {
  const cmd = program.command("config").description("Read/write CLI config");

  cmd
    .command("get")
    .argument("<key>", `Config key (${KNOWN_KEYS.join(" | ")})`)
    .description("Print a single config value")
    .action((key: string) => {
      try {
        assertKey(key);
        const value = getValue(key);
        if (value === undefined) {
          process.exit(1);
        }
        process.stdout.write(`${value}\n`);
      } catch (err) {
        exitWith(err);
      }
    });

  cmd
    .command("set")
    .argument("<key>", `Config key (${KNOWN_KEYS.join(" | ")})`)
    .argument("<value>", "Value")
    .description("Set a config value")
    .action((key: string, value: string) => {
      try {
        assertKey(key);
        setValue(key, value);
        process.stdout.write(`set ${key}\n`);
      } catch (err) {
        exitWith(err);
      }
    });

  cmd
    .command("unset")
    .argument("<key>", `Config key (${KNOWN_KEYS.join(" | ")})`)
    .description("Remove a config value")
    .action((key: string) => {
      try {
        assertKey(key);
        deleteValue(key);
        process.stdout.write(`unset ${key}\n`);
      } catch (err) {
        exitWith(err);
      }
    });

  cmd
    .command("list")
    .description("Print all config (api-key redacted)")
    .option("--json", "Compact JSON output")
    .action((opts) => {
      const cfg = loadConfig();
      const safe = { ...cfg };
      if (typeof safe["api-key"] === "string" && safe["api-key"].length > 0) {
        safe["api-key"] = "********";
      }
      printJson({ path: configPath(), config: safe }, { json: opts.json });
    });
}
