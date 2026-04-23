import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const COMPLETIONS_DIR = path.resolve(HERE, "..", "completions");

export type Shell = "bash" | "zsh";

export function readCompletion(shell: Shell): string {
  const file = path.join(COMPLETIONS_DIR, `mc.${shell}`);
  return readFileSync(file, "utf8");
}
