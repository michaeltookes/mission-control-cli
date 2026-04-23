import { Command } from "commander";
import { readCompletion, type Shell } from "../completions.js";
import { exitWith } from "../output.js";

export function registerCompletions(program: Command): void {
  program
    .command("completions")
    .argument("<shell>", "bash | zsh")
    .description("Print shell completion script. Append to your shell rc file.")
    .action((shell: string) => {
      try {
        if (shell !== "bash" && shell !== "zsh") {
          throw new Error(`Unsupported shell: ${shell}. Use bash or zsh.`);
        }
        process.stdout.write(readCompletion(shell as Shell));
      } catch (err) {
        exitWith(err);
      }
    });
}
