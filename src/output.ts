import pc from "picocolors";

export interface OutputFlags {
  json?: boolean;
}

export function printJson(value: unknown, flags: OutputFlags = {}): void {
  process.stdout.write(
    flags.json ? JSON.stringify(value) + "\n" : JSON.stringify(value, null, 2) + "\n",
  );
}

export function printError(err: unknown): void {
  if (err instanceof Error) {
    process.stderr.write(pc.red(`error: ${err.message}`) + "\n");
  } else {
    process.stderr.write(pc.red(`error: ${String(err)}`) + "\n");
  }
}

export function exitWith(err: unknown, code = 1): never {
  printError(err);
  process.exit(code);
}
