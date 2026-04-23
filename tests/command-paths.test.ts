import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requestMock,
  resolveOrgMock,
  printJsonMock,
  exitWithMock,
} = vi.hoisted(() => ({
  requestMock: vi.fn(),
  resolveOrgMock: vi.fn(),
  printJsonMock: vi.fn(),
  exitWithMock: vi.fn((err: unknown) => {
    throw err;
  }),
}));

vi.mock("../src/client.js", () => ({
  request: requestMock,
}));

vi.mock("../src/config.js", () => ({
  resolveOrg: resolveOrgMock,
}));

vi.mock("../src/output.js", () => ({
  printJson: printJsonMock,
  exitWith: exitWithMock,
}));

const { registerBacklog } = await import("../src/commands/backlog.js");
const { registerEvents } = await import("../src/commands/events.js");
const { registerHeartbeat } = await import("../src/commands/heartbeat.js");
const { registerTasks } = await import("../src/commands/tasks.js");

async function runProgram(register: (program: Command) => void, argv: string[]): Promise<void> {
  const program = new Command();
  program.exitOverride();
  register(program);
  await program.parseAsync(argv, { from: "user" });
}

describe("command API paths", () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({ ok: true });
    resolveOrgMock.mockReset();
    resolveOrgMock.mockReturnValue("acme/division?west#1");
    printJsonMock.mockReset();
    exitWithMock.mockReset();
  });

  it("URL-encodes org for events requests", async () => {
    await runProgram(registerEvents, ["events"]);

    expect(requestMock).toHaveBeenCalledWith("/api/org/acme%2Fdivision%3Fwest%231/events", {
      query: {
        type: undefined,
        actor: undefined,
        since: undefined,
        until: undefined,
        limit: undefined,
      },
    });
  });

  it("rejects invalid events timestamp flags during parsing", async () => {
    await expect(runProgram(registerEvents, ["events", "--since", "tomorrowish"])).rejects.toThrow(
      "Invalid value for --since: tomorrowish",
    );
    await expect(runProgram(registerEvents, ["events", "--until", "later"])).rejects.toThrow(
      "Invalid value for --until: later",
    );
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("URL-encodes org and id for task requests", async () => {
    await runProgram(registerTasks, ["tasks", "list"]);
    expect(requestMock).toHaveBeenLastCalledWith("/api/org/acme%2Fdivision%3Fwest%231/tasks", {
      query: {
        status: undefined,
        priority: undefined,
        owner: undefined,
        project: undefined,
      },
    });

    requestMock.mockClear();
    await runProgram(registerTasks, ["tasks", "get", "--id", "task/1?draft"]);
    expect(requestMock).toHaveBeenLastCalledWith(
      "/api/org/acme%2Fdivision%3Fwest%231/tasks/task%2F1%3Fdraft",
    );

    requestMock.mockClear();
    await runProgram(registerTasks, ["tasks", "create", "--title", "Fix bug"]);
    expect(requestMock).toHaveBeenLastCalledWith("/api/org/acme%2Fdivision%3Fwest%231/tasks", {
      method: "POST",
      body: {
        title: "Fix bug",
        priority: "P2",
      },
    });

    requestMock.mockClear();
    await runProgram(registerTasks, ["tasks", "update", "--id", "task/1?draft", "--title", "Retitle"]);
    expect(requestMock).toHaveBeenLastCalledWith(
      "/api/org/acme%2Fdivision%3Fwest%231/tasks/task%2F1%3Fdraft",
      {
        method: "PATCH",
        body: {
          title: "Retitle",
        },
      },
    );

    requestMock.mockClear();
    await runProgram(registerTasks, [
      "tasks",
      "claim",
      "--id",
      "task/1?draft",
      "--owner",
      "lucius",
    ]);
    expect(requestMock).toHaveBeenLastCalledWith(
      "/api/org/acme%2Fdivision%3Fwest%231/tasks/task%2F1%3Fdraft/claim",
      {
        method: "POST",
        body: { owner: "lucius" },
      },
    );
  });

  it("rejects invalid backlog priority during parsing", async () => {
    await expect(
      runProgram(registerBacklog, ["backlog", "add", "--title", "Investigate", "--priority", "P9"]),
    ).rejects.toThrow("Invalid priority: P9. Allowed: P0, P1, P2.");
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("rejects unsafe heartbeat token counts during parsing", async () => {
    await expect(
      runProgram(registerHeartbeat, [
        "heartbeat",
        "--agent",
        "lucius",
        "--context-tokens",
        "9007199254740992",
      ]),
    ).rejects.toThrow("Expected safe non-negative integer, got: 9007199254740992");
    expect(requestMock).not.toHaveBeenCalled();
  });
});
