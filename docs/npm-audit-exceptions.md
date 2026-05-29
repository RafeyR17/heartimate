# npm audit exceptions

CI runs `npm audit --audit-level=high` and **fails on high/critical** findings. Moderate/low issues are logged but do not block merges.

## Documented exceptions

| Advisory | Package | Severity | Status | Notes |
|----------|---------|----------|--------|-------|
| [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | `postcss` (via `next`) | moderate | accepted | Transitive dependency bundled by Next.js. `npm audit fix --force` downgrades Next to 9.x (breaking). Monitor Next.js release notes; bump when upstream ships patched postcss. |
| [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x) | `cookie` (via `@lhci/cli` → `lighthouse` → `@sentry/node`) | low | accepted | Dev-only Lighthouse CI tooling; not in production runtime. Revisit on `@lhci/cli` bumps. |
| [GHSA-52f5-9888-hmc6](https://github.com/advisories/GHSA-52f5-9888-hmc6), [GHSA-ph9p-34f9-6g65](https://github.com/advisories/GHSA-ph9p-34f9-6g65) | `tmp` (via `@lhci/cli` → `inquirer`) | high | **mitigated** | `package.json` `overrides` pins `tmp@0.2.7` (dev-only Lighthouse CLI). |
| [GHSA-qjx8-664m-686j](https://github.com/advisories/GHSA-qjx8-664m-686j) | `js-cookie` (via `@clerk/shared`) | high | **mitigated** | `package.json` `overrides` pins `js-cookie@3.0.7` until Clerk ships a direct bump. |

## Process

1. Run locally: `npm audit` and `npm audit --audit-level=high`.
2. For new high/critical: fix or patch immediately; do not add to this list without security review.
3. Dependabot opens weekly PRs (`.github/dependabot.yml`); review Clerk and Next changelogs before merging major bumps.
4. Lockfile (`package-lock.json`) is committed — avoid casual `npm install` without reviewing dependency changes.

## False positives

`npm audit` can report issues in dev-only trees or already-mitigated paths. Verify exploitability in our app (server vs client, reachable code) before ignoring.
