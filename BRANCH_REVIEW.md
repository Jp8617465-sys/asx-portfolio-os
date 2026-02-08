# Branch Review — 2026-02-08

## Overview

Reviewed all 20 remote branches against `origin/main`. Recommendation: reduce from 20 branches to 2-3.

## Safe to Delete — Fully Merged (6 branches)

| Branch | Merged Via | Status |
|---|---|---|
| `bugfix/fix-cors-auth-options-400` | PR #13 | 0 ahead, 82 behind |
| `copilot/add-eodhd-data-fetch-job` | PR #23 | 0 ahead, 46 behind |
| `feature/frontend-testing-v2` | PR #25 | 0 ahead, 44 behind |
| `feature/phase2-modular-architecture` | PR #33/#34/#35 | 0 ahead, 13 behind |
| `refactor-build` | (oldest branch, Jan 18) | 0 ahead, 112 behind |
| `claude/test-end-to-end-ejO67` | Same as main HEAD | 0 ahead, 0 behind |

## Safe to Delete — Stale/Superseded (9 branches)

| Branch | Ahead/Behind | Reason |
|---|---|---|
| `copilot/analyze-ci-workflows-accuracy` | 1 / 41 | Only "Initial plan" commit |
| `copilot/check-code-lines-asx-portfolio-os` | 1 / 95 | Only "Initial plan" commit |
| `copilot/explain-action-run-details` | 2 / 44 | Initial plan + minor ESLint change already merged |
| `copilot/fix-job-62329536772` | 7 / 55 | SSR/Jest work superseded by later PRs |
| `copilot/fix-ssr-localstorage-errors` | 5 / 55 | Content merged via PR #20 |
| `fix/ssr-localstorage-errors` | 6 / 55 | PR #20 merge branch, content in main |
| `fix/eslint-test-errors` | 1 / 32 | Merged via PRs #28/#30/#31 |
| `fix/migrate-passlib-to-pwdlib` | 1 / 25 | Merged via PR #32 |
| `copilot/refactor-database-schema` | 6 / 79 | Superseded by PR #16 (refactor-database-schema-again) |

## Safe to Delete — Heavily Diverged, Superseded (2 branches)

| Branch | Ahead/Behind | Reason |
|---|---|---|
| `feature/frontend-testing` | 76 / 157 | Superseded by `frontend-testing-v2` (merged in PR #25) |
| `feature/my-feature` | 77 / 157 | Fork of `frontend-testing`, same divergence |

## Keep / Evaluate (2 branches)

| Branch | Ahead/Behind | Notes |
|---|---|---|
| `claude/analyze-codebase-improvements-NWdtX` | 3 / 0 | Active work on "Midnight Indigo" design system + perf/SSR overhaul. Based on latest main. |
| `copilot/explore-tech-debt-refactoring` | 15 / 45 | Substantive tech debt cleanup but heavily stale. Config changes likely conflict with main. |

## Recommended Actions

1. Delete 17 stale/merged branches
2. Keep `claude/analyze-codebase-improvements-NWdtX` if design/perf work is wanted
3. Delete `copilot/explore-tech-debt-refactoring` unless docs/type centralization is specifically needed
