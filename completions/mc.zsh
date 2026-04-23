#compdef mc
# zsh completion for mc — generated, do not edit
_mc() {
  local -a commands
  commands=(
    'heartbeat:heartbeat'
    'status:status'
    'agents:agents'
    'tasks:tasks'
    'projects:projects'
    'backlog:backlog'
    'events:events'
    'tail:tail'
    'config:config'
    'completions:completions'
  )

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi

  case "$words[2]" in
    agents)
      local -a sub
      sub=('list' 'update-status')
      _describe 'agents' sub
      ;;
    tasks)
      local -a sub
      sub=('list' 'get' 'create' 'update' 'claim')
      _describe 'tasks' sub
      ;;
    projects)
      local -a sub
      sub=('list' 'get' 'create' 'update')
      _describe 'projects' sub
      ;;
    backlog)
      local -a sub
      sub=('add')
      _describe 'backlog' sub
      ;;
    config)
      local -a sub
      sub=('get' 'set' 'unset' 'list')
      _describe 'config' sub
      ;;
  esac
}

_mc "$@"
