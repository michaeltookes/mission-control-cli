# bash completion for mc — generated, do not edit
_mc_completions() {
  local cur prev words cword
  COMPREPLY=()
  cur="${COMP_WORDS[COMP_CWORD]}"
  prev="${COMP_WORDS[COMP_CWORD-1]}"

  if [ "${COMP_CWORD}" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "heartbeat status agents tasks projects backlog events tail config completions" -- "${cur}") )
    return 0
  fi

  local cmd="${COMP_WORDS[1]}"
  case "${cmd}" in
    agents)
      COMPREPLY=( $(compgen -W "list update-status" -- "${cur}") )
      return 0
      ;;
    tasks)
      COMPREPLY=( $(compgen -W "list get create update claim" -- "${cur}") )
      return 0
      ;;
    projects)
      COMPREPLY=( $(compgen -W "list get create update" -- "${cur}") )
      return 0
      ;;
    backlog)
      COMPREPLY=( $(compgen -W "add" -- "${cur}") )
      return 0
      ;;
    config)
      COMPREPLY=( $(compgen -W "get set unset list" -- "${cur}") )
      return 0
      ;;
  esac
}
complete -F _mc_completions mc
