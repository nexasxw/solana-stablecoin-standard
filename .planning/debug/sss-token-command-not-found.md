---
status: diagnosed
trigger: "Diagnose this UAT gap and find root cause only (no code changes). `sss-token --help` => command not found."
created: 2026-03-11T05:16:09Z
updated: 2026-03-11T05:22:36Z
---

## Current Focus

hypothesis: The CLI build exists, but shell command exposure is missing because the monorepo does not install/link `@stbr/sss-token` binary into a PATH-visible location for direct `sss-token ...` use.
test: Validate resolution behavior across `command -v`, PATH contents, and build artifact presence; then probe local workspace bin invocations.
expecting: `command -v sss-token` remains unresolved while `sdk/core/dist/cli.js` exists and can likely run through package-manager/local-bin entrypoints.
next_action: root cause confirmed; return diagnosis only

## Symptoms

expected: Running `sss-token --help` should show grouped command surfaces with discoverable global flags and commands.
actual: `sss-token: command not found`
errors: `sss-token: command not found`
reproduction: Test 3 in `.planning/phases/06-admin-cli/06-UAT.md`
started: 2026-03-11 UAT execution (Phase 06)

## Eliminated

## Evidence

- timestamp: 2026-03-11T05:16:09Z
  checked: `.planning/phases/06-admin-cli/06-UAT.md`
  found: Tests 1-3 fail with identical shell error `sss-token: command not found`; tests 4-9 pass.
  implication: Core blocker is command discoverability/execution from shell environment, not parser/command-shape behavior once CLI runs.

- timestamp: 2026-03-11T05:16:09Z
  checked: `sdk/core/package.json`
  found: Package declares `bin.sss-token = dist/cli.js`.
  implication: CLI command is package-managed and requires install/link/build pipeline to expose executable.

- timestamp: 2026-03-11T05:16:09Z
  checked: root `README.md` and root `package.json`
  found: README quick-start uses `sss-token ...` directly; root package has no script to invoke/link CLI command globally or via workspace wrapper.
  implication: Documentation assumes command availability without an explicit discoverability step in workspace root flow.

- timestamp: 2026-03-11T05:16:30Z
  checked: shell resolution command `command -v sss-token`
  found: no resolved executable.
  implication: failure reproduces in current environment as a shell lookup problem.

- timestamp: 2026-03-11T05:16:30Z
  checked: environment PATH and `sdk/core/dist`
  found: PATH has no repository `node_modules/.bin` segment; compiled `sdk/core/dist/cli.js` exists.
  implication: artifact exists but is not exposed via shell PATH, separating build availability from command discoverability.

- timestamp: 2026-03-11T05:16:26Z
  checked: direct invocation `node sdk/core/dist/cli.js --help`
  found: CLI executes and prints command/help surface including `init` and admin/compliance commands.
  implication: CLI implementation is functional; failure point is executable exposure/distribution.

- timestamp: 2026-03-11T05:18:11Z
  checked: yarn command routing (`yarn sss-token --help` and `yarn workspace @stbr/sss-token sss-token --help`)
  found: both return `Command "sss-token" not found.`
  implication: workspace setup does not expose a runnable `sss-token` bin via current package-manager commands either.

- timestamp: 2026-03-11T05:22:11Z
  checked: workspace install artifacts (`node_modules/@stbr/sss-token`, `node_modules/.bin`, `sdk/core/node_modules/.bin`)
  found: workspace package symlink exists, but no `sss-token` executable shim exists in either `.bin` directory.
  implication: package is present but command shim creation/exposure step is missing for shell execution.

## Resolution

root_cause: The `sss-token` executable is defined only as the SDK workspace package binary (`sdk/core/package.json` -> `bin.sss-token`) and is not installed/linked into a PATH-visible location for direct shell use from repo root. UAT invokes `sss-token` as a shell command, so lookup fails before CLI logic runs.
fix: ""
verification: Reproduced unresolved command lookup (`command -v sss-token` empty) while direct Node execution of compiled CLI succeeds (`node sdk/core/dist/cli.js --help`).
files_changed: []
