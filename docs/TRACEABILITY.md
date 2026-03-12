# Documentation Requirement Traceability (Phase 09)

## Scope

This matrix maps `DOC-01`, `DOC-02`, and `DOC-03` to concrete documentation sections and auditable verification evidence used during Phase 09 execution.

## Requirement Matrix

| Requirement | Requirement statement | Documentation coverage (section anchors) | Verification commands | Evidence source |
|---|---|---|---|---|
| DOC-01 | Reviewer-facing documentation explains architecture, presets, SDK usage, operations, compliance, and API surfaces. | `README.md#documentation`; `docs/ARCHITECTURE.md#layer-model`; `docs/SSS-1.md#overview`; `docs/SSS-2.md#overview`; `docs/SDK.md#scope`; `docs/COMPLIANCE.md#source-of-truth`; `docs/API.md#scope`; `docs/OPERATIONS.md#scope` | `rg -n "Documentation|Architecture|SDK|COMPLIANCE|API|OPERATIONS" README.md docs/*.md` | `.planning/phases/09-documentation/09-01-SUMMARY.md`; `.planning/phases/09-documentation/09-02-SUMMARY.md`; `.planning/phases/09-documentation/09-03-SUMMARY.md`; `.planning/phases/09-documentation/09-04-SUMMARY.md` |
| DOC-02 | Examples in docs match actual SDK and program interfaces. | `README.md#typescript-sdk`; `README.md#cli`; `docs/SDK.md#lifecycle-operations`; `docs/SDK.md#sss-2-compliance-operations`; `docs/API.md#cli-and-sdk-drift-checks` | `./scripts/sss-token --help && ./scripts/sss-token mint --help && ./scripts/sss-token burn --help && ./scripts/sss-token seize --help` | `.planning/phases/09-documentation/09-06-SUMMARY.md`; `.planning/phases/09-documentation/09-VERIFICATION.md`; `.planning/phases/09-documentation/09-VALIDATION.md` |
| DOC-03 | Operational docs explain local stack and reviewer flows. | `docs/OPERATIONS.md#deterministic-command-contract`; `docs/OPERATIONS.md#step-1-validate-compose-configuration`; `docs/OPERATIONS.md#reviewer-command-to-artifact-mapping`; `docs/testing/phase-08-command-truth.md#verification-lanes`; `docs/testing/phase-08-devnet-evidence.md#reviewer-command-to-artifact-table` | `docker compose config >/dev/null`; `for f in README.md docs/*.md docs/testing/*.md; do grep -oE 'docs/[A-Za-z0-9_./-]+\\.md' "$f" || true; done \| sort -u \| while read -r p; do test -f "$p" || { echo "missing:$p"; exit 1; }; done` | `.planning/phases/09-documentation/09-04-SUMMARY.md`; `docs/testing/phase-08-command-truth.md`; `docs/testing/phase-08-devnet-evidence.md` |

## Notes

- Verification commands are intentionally executable from repository root.
- When environment constraints prevent runtime checks (for example, missing Docker), the evidence source remains the latest signed-off Phase summary with explicit constraint notes.
