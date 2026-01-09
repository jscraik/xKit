# Releasing xKit

_Last updated: 2026-01-09_

## Doc requirements

- Audience: maintainers publishing npm releases and Homebrew updates.
- Scope: release checklist, npm publish, Git tag/GitHub release, Homebrew tap update.
- Non-scope: CI/CD automation details or marketing comms.
- Owner: Jamie Craik.
- Review cadence: Quarterly.

Target destinations:

- npm: `@brainwav/xkit`
- Homebrew: tap formula in `jscraik/homebrew-tap` (e.g., `xkit.rb`)

## Risks and assumptions

- Assumes you have npm publish access for the `@brainwav` scope.
- Publishing and tagging are irreversible without coordinated rollback.
- Homebrew formula updates require access to the tap repository.

## Checklist (npm + GitHub)

1) Version bump
   - Update `package.json` `version` (semver, e.g., `0.5.0`).
   - Update `CHANGELOG.md` and tag the release section.

2) Clean build & tests
   - `pnpm install`
   - `pnpm test`
   - `pnpm run build`

3) Publish to npm (scoped)
   - Ensure you are logged in (`npm whoami`).
   - `npm publish --access public` (from repo root). Package name is `@brainwav/xkit`.
   - Verify:
     - `npm view @brainwav/xkit version`
     - `npx -y @brainwav/xkit@<version> --help`

4) Git tag & GitHub release
   - `git tag v<version> && git push origin v<version>`
   - Create GitHub release from the tag. Include changelog notes and attach optional binary (see below).

## Optional: attach compiled binary

If you want a single-file binary for Homebrew/GitHub assets:

- Build: `pnpm run binary` (uses Bun to produce `./xkit`).
- Upload `xkit` to the GitHub release and use it for the Homebrew tarball.

## Homebrew tap update (jscraik/homebrew-tap)

1) Package the binary
   - From repo root: `tar -czf xkit-macos-universal-v<version>.tar.gz xkit`
   - Compute SHA: `shasum -a 256 xkit-macos-universal-v<version>.tar.gz`

2) Update formula in tap repo
   - File: `homebrew-tap/xkit.rb` (create if absent). Model it after `poltergeist.rb`.
   - Fields to update:
     - `url "https://github.com/steipete/xkit/releases/download/v<version>/xkit-macos-universal-v<version>.tar.gz"`
     - `sha256 "<calculated_sha>"`
     - `version "<version>"`
   - Install block: `bin.install "xkit"`
   - `test do`: minimal `assert_match "<version>", shell_output("#{bin}/xkit --version")`

3) Push tap changes
   - `git add xkit.rb && git commit -m "xkit 0.1.0" && git push`

## Release order suggestion

1) Merge to `main` and tag.
2) Publish npm.
3) Build binary, upload to GitHub release.
4) Update Homebrew tap with new URL/SHA.

## Notes

- Scoped npm name (`@brainwav/xkit`) requires `--access public` on first publish.
- Homebrew formula assumes macOS universal binary; adjust URL/name if you ship per-arch.
- Config defaults (JSON5) and Safari/Chrome/Firefox cookie selection are documented in `README.md` — keep that in sync for each release.

## Verify

- `npm view @brainwav/xkit version` returns the released version.
- `npx -y @brainwav/xkit@<version> --help` runs successfully.
- Homebrew `xkit --version` matches the release when installed from the tap.

## Acceptance criteria

- [ ] Version bump and changelog updates are complete.
- [ ] `pnpm test` and `pnpm run build` succeed before publish.
- [ ] npm publish uses `@brainwav/xkit` and verification commands succeed.
- [ ] Git tag + GitHub release are created from the same version.
- [ ] Homebrew tap update points to the correct release asset and SHA.

## Evidence bundle

- Vale: not run (no `.vale.ini` in repo).
- Markdown lint: not run (no config detected).
- Readability check: not run (no `scripts/check_readability.py`).
