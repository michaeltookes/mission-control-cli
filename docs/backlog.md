# Backlog

Prioritized list of planned features, improvements, and technical debt for `@michaeltookes/mission-control-cli`.

## High Priority

_None yet._

## Medium Priority

_None yet._

## Low Priority

_None yet._

## Notes

- Task priority values are documented in-repo, but the full task status enum is not; avoid hard-coding additional CLI status validation without an authoritative local contract.

## Completed

- CLI hardening pass for startup path resolution, filtered tail cursor advancement, request/config safeguards, CI/doc updates, and supporting test coverage (completed: 2026-04-22).
- Encode org path segments consistently across CLI API routes, validate loaded config value types, and tighten `tail --filter` handling for typeless events (completed: 2026-04-22).
- Tighten heartbeat integer parsing, tail cursor/error handling, and parse-time validation for backlog priority and event timestamp flags (completed: 2026-04-22).
- Enforce strict ISO parsing for event timestamp flags and prevent `tail` starvation on inclusive equal-timestamp windows (completed: 2026-04-22).

Resolved items live in [`docs/resolved.md`](./resolved.md).
