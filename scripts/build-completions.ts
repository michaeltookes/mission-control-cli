import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProgram } from "../src/index.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "..", "completions");

mkdirSync(OUT, { recursive: true });

const program = createProgram();

interface CmdNode {
  name: string;
  subcommands: string[];
}

function collect(cmd: ReturnType<typeof createProgram>): CmdNode[] {
  const nodes: CmdNode[] = [];

  function walk(c: ReturnType<typeof createProgram>, prefix: string[]): void {
    const sub = c.commands.map((s) => s.name());
    nodes.push({
      name: prefix.length === 0 ? c.name() : prefix.join(" "),
      subcommands: sub,
    });
    for (const sc of c.commands) {
      walk(sc, [...prefix, sc.name()]);
    }
  }

  walk(cmd, []);
  return nodes;
}

const nodes = collect(program);
const root = nodes[0];

const allTopLevel = root.subcommands.join(" ");

const bashScript = `# bash completion for mc — generated, do not edit
_mc_completions() {
  local cur prev words cword
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  if [ "\${COMP_CWORD}" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${allTopLevel}" -- "\${cur}") )
    return 0
  fi

  local cmd="\${COMP_WORDS[1]}"
  case "\${cmd}" in
${nodes
  .filter((n) => n.subcommands.length > 0 && n.name !== root.name)
  .map(
    (n) => `    ${n.name.split(" ")[0]})
      COMPREPLY=( $(compgen -W "${n.subcommands.join(" ")}" -- "\${cur}") )
      return 0
      ;;`,
  )
  .join("\n")}
  esac
}
complete -F _mc_completions mc
`;

const zshScript = `#compdef mc
# zsh completion for mc — generated, do not edit
_mc() {
  local -a commands
  commands=(
${root.subcommands.map((s) => `    '${s}:${s}'`).join("\n")}
  )

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi

  case "$words[2]" in
${nodes
  .filter((n) => n.subcommands.length > 0 && n.name !== root.name)
  .map(
    (n) => `    ${n.name.split(" ")[0]})
      local -a sub
      sub=(${n.subcommands.map((s) => `'${s}'`).join(" ")})
      _describe '${n.name}' sub
      ;;`,
  )
  .join("\n")}
  esac
}

_mc "$@"
`;

writeFileSync(path.join(OUT, "mc.bash"), bashScript);
writeFileSync(path.join(OUT, "mc.zsh"), zshScript);

process.stdout.write(`Wrote completions/mc.bash and completions/mc.zsh\n`);
