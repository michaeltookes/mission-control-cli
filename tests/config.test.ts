import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  loadConfig,
  saveConfig,
  getValue,
  setValue,
  deleteValue,
  configPath,
  resolveApiUrl,
  resolveApiKey,
  resolveOrg,
  ConfigError,
} from "../src/config.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "mc-cli-cfg-"));
  process.env.MC_CONFIG_PATH = path.join(dir, "config.json");
  delete process.env.MC_API_URL;
  delete process.env.MC_API_KEY;
  delete process.env.MC_ORG;
});

afterEach(() => {
  delete process.env.MC_CONFIG_PATH;
  rmSync(dir, { recursive: true, force: true });
});

describe("config", () => {
  it("returns empty config when file is missing", () => {
    expect(loadConfig()).toEqual({});
  });

  it("round-trips a value through set/get", () => {
    setValue("api-url", "https://example.com/");
    expect(getValue("api-url")).toBe("https://example.com/");
    expect(existsSync(configPath())).toBe(true);
  });

  it("trims trailing slash from api-url at resolve time", () => {
    setValue("api-url", "https://example.com/");
    expect(resolveApiUrl()).toBe("https://example.com");
  });

  it("validates tail-interval as a positive number", () => {
    expect(() => setValue("tail-interval", "0")).toThrow(/positive/);
    expect(() => setValue("tail-interval", "abc")).toThrow();
    setValue("tail-interval", "5");
    expect(getValue("tail-interval")).toBe(5);
  });

  it("deleteValue removes a key", () => {
    setValue("api-key", "secret");
    deleteValue("api-key");
    expect(getValue("api-key")).toBeUndefined();
  });

  it("ignores corrupted JSON", () => {
    saveConfig({ "api-url": "https://example.com" });
    const file = configPath();
    writeFileSync(file, "not json");
    expect(loadConfig()).toEqual({});
  });

  it("env vars override config", () => {
    setValue("api-url", "https://from-config.example");
    process.env.MC_API_URL = "https://from-env.example";
    expect(resolveApiUrl()).toBe("https://from-env.example");
  });

  it("throws ConfigError when api-url is missing", () => {
    expect(() => resolveApiUrl()).toThrow(ConfigError);
  });

  it("throws ConfigError when api-key is missing", () => {
    expect(() => resolveApiKey()).toThrow(ConfigError);
  });

  it("resolveOrg prefers explicit override > env > config", () => {
    setValue("default-org", "from-config");
    process.env.MC_ORG = "from-env";
    expect(resolveOrg("from-arg")).toBe("from-arg");
    expect(resolveOrg()).toBe("from-env");
    delete process.env.MC_ORG;
    expect(resolveOrg()).toBe("from-config");
  });

  it("writes config file with mode 0600", () => {
    const file = configPath();
    writeFileSync(file, "{}", { mode: 0o644 });
    saveConfig({ "api-key": "secret" });
    const stat = statSync(file);
    const mode = stat.mode & 0o777;
    expect(mode).toBe(0o600);
    expect(readFileSync(file, "utf8")).toContain("api-key");
  });
});
