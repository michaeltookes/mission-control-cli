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

const { registerEvents } = await import("../src/commands/events.js");
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
});
