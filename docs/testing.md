# Testing

Last updated: 2026-01-09

## Doc requirements

- Audience: contributors running local tests.
- Scope: unit tests and live tests, required environment variables, and expected behavior.
- Non-scope: CI configuration, performance benchmarking, or release validation.
- Owner: Jamie Craik.
- Review cadence: Quarterly.

## Unit tests (default)

- `pnpm test`

## Risks and assumptions

- Live tests hit real X/Twitter endpoints and may face rate limits or blocks without notice.
- You must have valid cookies for a logged-in account.
- Avoid running live tests on shared or production accounts without approval.

## Live tests (hits Twitter/X)

Run the CLI against real Twitter/X GraphQL endpoints to verify read-only commands still work.

Requirements:

- Auth cookies in env:
  - `AUTH_TOKEN` (or `TWITTER_AUTH_TOKEN`)
  - `CT0` (or `TWITTER_CT0`)
- Network access

Run:

- `pnpm test:live`

Notes:

- Live tests skip unless `XKIT_LIVE=1` (set by `pnpm test:live`).
- Configure search query via `XKIT_LIVE_SEARCH_QUERY`.
- Configure command timeout via `XKIT_LIVE_TIMEOUT_MS` (ms).
- Configure cookie extraction timeout via `XKIT_LIVE_COOKIE_TIMEOUT_MS` (ms).
- Spawned CLI `NODE_ENV` defaults to `production` (override with `XKIT_LIVE_NODE_ENV`).
- If you do not tweet, set `XKIT_LIVE_TWEET_ID` to a known tweet ID to use for `read/replies/thread`.
- Optionally set `XKIT_LIVE_BOOKMARK_FOLDER_ID` to exercise `bookmarks --folder-id`.
- For live `xkit query-ids --fresh` coverage, set `XKIT_LIVE_QUERY_IDS_FRESH=1`.
- The live suite may hit internal X endpoints (v1.1 REST) as fallback; it still uses cookie auth (no developer API key).

## Verify

- `pnpm test` exits with code 0 and no test failures.
- `pnpm test:live` exercises live tests only when you set `XKIT_LIVE=1`.

## Acceptance criteria

- [ ] `pnpm test` runs locally without extra setup.
- [ ] `pnpm test:live` runs only when `XKIT_LIVE=1`.
- [ ] Environment variable names match the live test suite.
- [ ] Risks and assumptions cover live testing impacts.

## Evidence bundle

- Vale: ran (0 errors, 0 warnings, 0 suggestions across docs).
- Markdown lint: ran (0 errors).
- Readability check: not run (no `scripts/check_readability.py`).
