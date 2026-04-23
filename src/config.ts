import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const DEFAULT_PATH = path.join(homedir(), ".mission-control", "config.json");

export type ConfigKey =
  | "api-url"
  | "api-key"
  | "default-org"
  | "tail-interval";

export interface Config {
  "api-url"?: string;
  "api-key"?: string;
  "default-org"?: string;
  "tail-interval"?: number;
}

export function configPath(): string {
  return process.env.MC_CONFIG_PATH ?? DEFAULT_PATH;
}

export function loadConfig(): Config {
  const file = configPath();
  if (!existsSync(file)) return {};
  try {
    const raw = readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Config;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveConfig(cfg: Config): void {
  const file = configPath();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n", { mode: 0o600 });
}

export function getValue(key: ConfigKey): string | number | undefined {
  return loadConfig()[key];
}

export function setValue(key: ConfigKey, value: string): void {
  const cfg = loadConfig();
  if (key === "tail-interval") {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 1) {
      throw new Error(`tail-interval must be a positive number, got: ${value}`);
    }
    cfg["tail-interval"] = n;
  } else {
    cfg[key] = value;
  }
  saveConfig(cfg);
}

export function deleteValue(key: ConfigKey): void {
  const cfg = loadConfig();
  delete cfg[key];
  saveConfig(cfg);
}

export function resolveApiUrl(): string {
  const url = process.env.MC_API_URL ?? loadConfig()["api-url"];
  if (!url) {
    throw new ConfigError(
      "Missing api-url. Run `mc config set api-url https://genkeilabs.dev`.",
    );
  }
  return url.replace(/\/$/, "");
}

export function resolveApiKey(): string {
  const key = process.env.MC_API_KEY ?? loadConfig()["api-key"];
  if (!key) {
    throw new ConfigError(
      "Missing api-key. Set MC_API_KEY or run `mc config set api-key <key>`.",
    );
  }
  return key;
}

export function resolveOrg(override?: string): string {
  const org = override ?? process.env.MC_ORG ?? loadConfig()["default-org"];
  if (!org) {
    throw new ConfigError(
      "Missing org. Pass --org <slug>, set MC_ORG, or run `mc config set default-org <slug>`.",
    );
  }
  return org;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}
