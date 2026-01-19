schema_version: 1
# Technical Specification: xKit CLI + Bookmark Archiving

**Owner:** Jamie Craik
**Status:** Phase 1 Complete - Pre-Release Checklist In Progress
**Last updated:** 2026-01-19
**Related PRD:** .specs/spec-2026-01-15-xkit-prd.md
**Repo / Tracking:** /Users/jamiecraik/dev/xKit
**Reviewers:** N/A (solo dev)
**Release target:** 2026-02-01 (BLOCKED on evidence validation)
**Phase 1 Complete:** 2026-01-17  

---

## 0) Summary
- **One-liner:** Build a reliable, scriptable X/Twitter CLI with a stable JSON surface and a bookmark archiving pipeline.
- **Primary goal:** Deliver a dependable CLI wedge for learning + profile growth, with a durable archive output format.
- **Key risks:** X GraphQL volatility, cookie auth changes, and low evidence of adoption.
- **Rollout shape:** Phased release via npm + Homebrew; no server-side rollout.

---

## 1) Overview / Context
### Context
xKit provides a Node/TypeScript CLI that accesses X/Twitter via cookie-based GraphQL requests. It exposes read/search/thread/mentions/news/bookmarks/lists plus an archive workflow that enriches bookmarks and writes Markdown output. This spec formalizes stable outputs, error handling, and operational safeguards.

### Constraints
- Platform constraints: Node.js (>=22), TypeScript, ESM, Commander CLI, Bun for optional binary build.
- Integration constraints: Undocumented X/Twitter GraphQL endpoints and query IDs.
- Compliance constraints: N/A (no payment/PHI); privacy focus on cookie handling.
- Operating constraints: No on-call; best-effort reliability; runbook-based response.

### Glossary
- Query IDs: Cached GraphQL query identifiers used by X endpoints.
- Archive pipeline: Fetch → Enrich → Categorize → Write Markdown.

---

## 2) Goals and Non-Goals
### Goals
- G1: Stable, documented JSON outputs for all supported commands.
- G2: Reliable bookmark archiving with deterministic Markdown structure.
- G3: Clear, actionable error guidance for auth, rate limit, and API changes.

### Non-Goals (required; RNIA — if N/A, say why)
- NG1: Official API support (out of scope for the project).
- NG2: Advanced cloud LLM integrations (OpenAI, Anthropic, etc.) - local AI (Ollama) implemented in Phase 1, but cloud integrations remain out of scope.
- NG3: Parallel processing or token tracking (explicitly skipped).

### Success criteria (engineering)
- p95 CLI command completion <= 2s for typical read/search operations.
  - Status: ⚠️ **UNVERIFIED** - No performance measurements collected
- CLI error rate < 3% (30-day window, opt-in telemetry or manual tracking).
  - Status: ⚠️ **UNVERIFIED** - Telemetry not implemented
- JSON output schema stays backward compatible for one major version.
  - Status: ✅ **MAINTAINED** - No breaking changes

**CRITICAL:** Engineering success criteria cannot be claimed as met without actual measurement. This represents a significant gap in operational readiness.

---

## User Stories
1) As a Solo Dev, I want to read a tweet/thread by ID or URL so that I can quickly capture context for scripts.
2) As a Researcher/Writer, I want to archive bookmarks to markdown so that I can build a personal knowledge base.
3) As a Solo Dev, I want to refresh query IDs so that I can recover from API changes without rebuilding the tool.
4) As a Researcher/Writer, I want categorized outputs so I can keep my archive organized by content type.
5) As a CLI user, I want a plain output mode so that I can use the tool in scripts or accessibility tools without ANSI noise.

---

## 3) System Architecture
### Architecture diagram (Mermaid)
```mermaid
flowchart LR
  CLI[CLI Entrypoint] --> Router[Command Router]
  Router --> Creds[Credential Resolver]
  Router --> XAPI[X GraphQL Client]
  XAPI --> X[X/Twitter GraphQL]
  Router --> Archive[Archive Pipeline]
  Archive --> Enrich[Enrichment]
  Enrich --> Content[ContentExtractor]
  Content --> Article[ArticleExtractor]
  Content --> Ollama[OllamaClient]
  Archive --> Categorize[Categorization]
  Archive --> Writer[Markdown Writer]
  Writer --> FS[(Local Files)]
  Router --> QueryIds[Query ID Cache]
  QueryIds --> FS
  Ollama -.->|optional| OllamaSvc[(Ollama Service)]
```

### Architectural decisions (with rationale)
* **Decision:** Cookie-based auth only.  
  **Rationale:** No official API keys; aligns with current workflow.  
  **Alternatives:** Official API, OAuth.  
  **Tradeoffs:** Higher breakage risk; must include runbook.

* **Decision:** Stable JSON output schema with version marker.  
  **Rationale:** Enables scripts and long-term compatibility.  
  **Alternatives:** Best-effort outputs or raw passthrough.  
  **Tradeoffs:** Requires disciplined schema evolution.

* **Decision:** Schema change policy for JSON output.  
  **Rationale:** Prevents breaking downstream scripts.  
  **Alternatives:** Unversioned JSON or undocumented changes.  
  **Tradeoffs:** More release discipline required.  
  **Policy:** Breaking changes require a major version bump and a 30-day deprecation note in README; non-breaking changes update `_schemaVersion` minor.

---

## 4) Component Design

### Component inventory

| Component | Type | Status | Phase |
| --- | --- | --- | --- |
| CLI Entrypoint | service | current | MVP |
| Command Router | service | current | MVP |
| Credential Resolver | service | current | MVP |
| X GraphQL Client | service | current | MVP |
| Archive Pipeline | job | current | MVP |
| Query ID Cache | job | current | MVP |
| Markdown Writer | lib | current | MVP |
| Enrichment | lib | current | MVP |
| Categorization | lib | current | MVP |
| ArticleExtractor | lib | **current** | **Phase 1** |
| OllamaClient | lib | **current** | **Phase 1** |
| ContentExtractor | lib | **current** | **Phase 1** |
| Setup Wizard | service | current | MVP |
| Webhook Notifications | service | current | MVP |
| Daemon Mode | service | current | MVP |

### Component: Archive Pipeline

**Status:** current

**Responsibilities**
* Fetch bookmarks
* Enrich and categorize
* Write deterministic Markdown

**Inputs**
* GraphQL bookmark responses
* Config (output paths, options)

**Outputs**
* Markdown archive file(s)
* Per-category files

**Owned data**
* Archive output files and state tracking

**Dependencies**
* X GraphQL Client
* Local filesystem

#### State machine
```mermaid
stateDiagram-v2
  [*] --> IDLE
  IDLE --> FETCHING: archive command
  FETCHING --> ENRICHING: bookmarks received
  FETCHING --> ERROR: fetch failed
  ENRICHING --> WRITING: enrichment done
  ENRICHING --> ERROR: enrichment failed
  WRITING --> SUCCESS: files written
  WRITING --> ERROR: write failed
  ERROR --> IDLE: user retries
  SUCCESS --> IDLE
```

#### Error modes & recovery
* Error: Auth or rate limit issues
  * Detection: error response + status code
  * Handling: surface guidance, recommend `xkit check` or retry
  * User impact: archive not updated
  * Data impact: do not commit partial writes

* Error: Write issues (permissions/paths)
  * Detection: filesystem error
  * Handling: show path and recommended fix
  * User impact: archive not updated
  * Data impact: no partial output

#### Scaling notes
* Expected load now: single user, tens to thousands of bookmarks.
* Expected load in 12–24 months: single user, tens of thousands of bookmarks.
* Bottlenecks: API rate limits, enrichment network calls; mitigated with incremental processing.

### Component: X GraphQL Client

**Status:** current

**Responsibilities**
* Send GraphQL queries using cached query IDs
* Normalize outputs for CLI and JSON modes

**Inputs**
* Cookies + query ID cache
* Command parameters

**Outputs**
* Normalized response objects

**Owned data**
* N/A (stateless)

**Dependencies**
* X/Twitter GraphQL endpoints

#### State machine
State machine: N/A (stateless client requests per call).

#### Error modes & recovery
* Error: Query ID not valid
  * Detection: 400/404/GraphQL error
  * Handling: suggest `xkit query-ids --fresh`
  * User impact: command fails
  * Data impact: none

---

### Component: ArticleExtractor (Phase 1)

**Status:** current (added 2026-01-17)

**Responsibilities**
* Extract full article content from web pages
* Convert HTML to clean Markdown using Turndown
* Calculate reading time and word count
* Extract article metadata (title, author, site name)

**Inputs**
* URL from bookmark enrichment pipeline
* HTML content (fetched via curl/https)

**Outputs**
* Extracted content object with fields:
  - `title`: string
  - `content`: string (Markdown)
  - `textContent`: string (plain text)
  - `author`: string?
  - `siteName`: string?
  - `readingTime`: number (minutes)
  - `wordCount`: number

**Owned data**
* None (stateless processor)

**Dependencies**
* @mozilla/readability - content extraction
* linkedom - DOM implementation
* turndown - HTML to Markdown conversion

#### State machine
State machine: N/A (stateless processor per URL).

#### Error modes & recovery
* Error: URL not accessible
  * Detection: HTTP error or timeout
  * Handling: degrade to basic bookmark entry
  * User impact: reduced content richness
  * Data impact: partial enrichment only

* Error: Content extraction fails
  * Detection: Readability returns empty
  * Handling: fallback to basic metadata
  * User impact: no full content
  * Data impact: degraded archive entry

---

### Component: OllamaClient (Phase 1)

**Status:** current (added 2026-01-17)

**Responsibilities**
* Detect Ollama availability
* Generate article summaries (2-3 sentences)
* Extract key points (3-5 bullet points)
* Handle model selection and timeouts

**Inputs**
* Article content (title + text)
* Model name (default: qwen2.5:7b)

**Outputs**
* AI-generated content:
  - `summary`: string (2-3 sentences)
  - `keyPoints`: string[] (3-5 bullets)
  - `aiGenerated`: boolean
  - `aiModel`: string

**Owned data**
* None (stateless client)

**Dependencies**
* ollama npm package
* Ollama server (localhost:11434)

#### State machine
```mermaid
stateDiagram-v2
  [*] --> CHECKING: summarize request
  CHECKING --> AVAILABLE: Ollama running
  CHECKING --> UNAVAILABLE: Ollama not responding
  AVAILABLE --> SUMMARIZING: content received
  SUMMARIZING --> SUCCESS: summary generated
  SUMMARIZING --> ERROR: timeout or model error
  ERROR --> UNAVAILABLE: fallback
  UNAVAILABLE --> [*]
  SUCCESS --> [*]
```

#### Error modes & recovery
* Error: Ollama not available
  * Detection: Connection refused to localhost:11434
  * Handling: graceful degradation, no AI features
  * User impact: no summaries
  * Data impact: basic archive only

* Error: Model timeout
  * Detection: Request exceeds 30s timeout
  * Handling: fail gracefully, continue without AI
  * User impact: partial AI processing
  * Data impact: some entries enriched, some not

* Error: Model overload
  * Detection: Ollama returns 503
  * Handling: retry once, then fallback
  * User impact: delayed processing
  * Data impact: may skip AI for some entries

#### Security considerations (CRITICAL)
* ⚠️ **Local network exposure:** Connects to localhost:11434 without authentication
* ⚠️ **Prompt injection risk:** Bookmark content could include malicious prompts
* ⚠️ **Resource exhaustion:** Models require 4GB+ RAM; could impact system performance
* ⚠️ **No content sanitization:** Raw bookmark content sent to AI model

**Mitigation status:**
- ✅ Graceful fallback when unavailable
- ❌ No prompt injection sanitization
- ❌ No resource limit warnings
- ❌ No content redaction before AI processing

**Required security review:** HIGH PRIORITY

---

## 5) API Design

### API overview
* Auth model: Cookie-based (auth_token + ct0) from local browser or env.
* Versioning: Stable JSON output schema with `_schemaVersion` field in JSON output.
* Idempotency: CLI commands behave idempotently unless explicitly writing output files.
* Pagination: Bookmark/archive flows must handle pagination with user-provided limits.
* Rate limits: Best-effort handling; clear error guidance on 429s.

### Endpoint: CLI Command Interface
* **Method:** CLI invocation
* **Path:** `xkit <command> [args]`
* **Auth:** Cookie presence required for X GraphQL calls
* **Idempotent:** Yes, except archive write operations (writes deterministic output)

**Request schema**
```json
{
  "command": "archive",
  "options": {
    "all": true,
    "maxPages": 5,
    "outputDir": "./knowledge"
  }
}
```

**Response schema (JSON mode)**
```json
{
  "_schemaVersion": "1",
  "_meta": {
    "command": "archive",
    "status": "ok"
  },
  "data": {
    "archiveFile": "./knowledge/bookmarks.md",
    "count": 20
  }
}
```

**Errors**
* 400: not-valid arguments or malformed config
* 401/403: missing or not-valid cookies
* 404: query ID not valid or endpoint changed
* 429: rate limit
* 5xx: upstream dependency error

### Sequence diagram (Archive flow)
```mermaid
sequenceDiagram
  participant U as User
  participant C as CLI
  participant X as X GraphQL
  U->>C: xkit archive
  C->>X: Fetch bookmarks
  X-->>C: Bookmark data
  C->>C: Enrich + categorize
  C-->>U: Write archive + summary
```

---

## 6) Data Models / Database Schema

### ER diagram (Mermaid)
```mermaid
erDiagram
  ARCHIVE_ENTRY {
    string id
    string url
    string author
    string created_at
    string category
    string source
  }
  ARCHIVE_ENTRY }o--|| CATEGORY : classified_as
  CATEGORY {
    string name
    string action
    string folder
  }
```

### Tables / Collections

#### archive_entry (markdown record)
* Primary key: `id`
* Fields:
  * `id`: string (tweet/bookmark id)
  * `url`: string (canonical URL)
  * `author`: string
  * `created_at`: string (ISO-8601)
  * `category`: string
  * `source`: string (xkit)
* Indexes: N/A (file-based)
* Retention: indefinite unless user deletes
* PII classification: low (public data)
* Consistency: strong within a single run; no partial writes

### Archive format contract (required)
- Frontmatter fields required: `id`, `url`, `author`, `created_at`, `category`, `source`.
- Optional fields: `title`, `summary`, `tags`, `expanded_url`.
- Degraded mode: if enrichment fails, output required fields only and include `enrichment_status: "skipped"` in frontmatter.

---

## 7) Infrastructure Requirements

* Runtime: Node.js 22+ (Bun optional for binary builds)
* Deployment: local CLI only
* Environments: local dev (no staging/prod)
* Config management: JSON5 config + environment variables
* Secrets: OS keychain/browser cookies; env vars for auth
* Networking: outbound HTTPS to X endpoints
* Cost considerations: user bandwidth + local compute only

---

## 8) Security Considerations (Required)

* Authentication: cookie-based auth_token + ct0
* Authorization: N/A (user's own account)
* Encryption: in transit (HTTPS); no at-rest encryption required for public bookmark data
* Input validation: schema validation for config and CLI args
* Secrets management: never log cookies; document safe handling

### Threats & mitigations

**Original Threats (MVP):**
* T1: Cookie exfiltration → never log cookies; redaction in error messages
* T2: API misuse/rate limits → backoff + user guidance

**NEW Threats (Phase 1 - Ollama Integration):**
* ⚠️ **T3: Prompt injection via bookmark content** → NO MITIGATION IMPLEMENTED
  * Attack vector: Malicious bookmark content includes prompt injection attempts
  * Impact: AI model could be influenced to generate unexpected/harmful content
  * Required mitigation: Content sanitization before AI processing
  * Status: ⚠️ **OPEN** - Security review required

* ⚠️ **T4: Local network exposure (Ollama)** → PARTIAL MITIGATION
  * Attack vector: Ollama endpoint (localhost:11434) has no authentication
  * Impact: Local network access could interfere with AI processing
  * Mitigation: Graceful fallback when unavailable
  * Status: ✅ Degradation works, but no access control

* ⚠️ **T5: Resource exhaustion (AI models)** → NO MITIGATION IMPLEMENTED
  * Attack vector: Processing many bookmarks could exhaust RAM (4GB+ per model)
  * Impact: System performance degradation, crashes
  * Required mitigation: Resource limits, batch size controls, user warnings
  * Status: ⚠️ **OPEN** - No resource management

* ⚠️ **T6: Unvalidated AI output in archives** → NO MITIGATION IMPLEMENTED
  * Attack vector: AI-generated summaries/keypoints stored without validation
  * Impact: Archives could contain misleading or harmful AI-generated content
  * Required mitigation: Output sanitization, AI attribution labels
  * Status: ✅ Attribution implemented, no sanitization

**Security Audit Status:** ❌ **REQUIRED** - Phase 1 introduced new attack vectors that have not been professionally assessed.

---

### Security Assessment (2026-01-19)

**⚠️ IMPORTANT:** A comprehensive security assessment was conducted for Phase 1 (Ollama integration). This assessment identified MEDIUM-HIGH risk issues that must be addressed before production use.

**Key Findings:**
- **Risk Level:** ⚠️ MEDIUM-HIGH
- **Critical Issues:**
  - No prompt injection sanitization
  - No resource limits for AI processing
  - Dependency audit not performed
- **Recommendation:** Professional security review recommended

**For complete threat analysis, testing requirements, and mitigation recommendations, see [SECURITY_ASSESSMENT-2026-01-19.md](.specs/SECURITY_ASSESSMENT-2026-01-19.md).**

**Required Actions (from Security Assessment):**

1. **Immediate (Before Production Use):**
   - Implement content sanitization (Section 4.1)
   - Add resource limits (Section 4.1)
   - Run dependency audit (`npm audit`)

2. **Short-term (Next Release):**
   - Add security test cases (Section 6.1)
   - Update security documentation (Section 4.2)

3. **Before Phase 2:**
   - Complete all security testing
   - Address all HIGH priority issues
   - Document security assumptions

---

## 9) Error Handling Strategy (Required)

* Error taxonomy: validation | auth | rate_limit | dependency | timeout | unknown
* Timeouts: 10s default per request; configurable via env
* Retry policy: no automatic retries for write operations; manual retry guidance
* Idempotency strategy: read/search/list behave idempotently; archive writes remain deterministic
* Degraded mode: if enrichment fails, write archive entries with required fields only and set `enrichment_status: "skipped"`
* User-facing error mapping: always include next-step guidance (e.g., `xkit check`, `xkit query-ids --fresh`)

### User-facing error mapping (required)
| Error type | Detection | Message includes | Next-step guidance |
|---|---|---|---|
| auth | 401/403 | missing/not-valid cookies | run `xkit check` and rerun command |
| rate_limit | 429 | rate limit detected | retry after cooldown; reduce `--max-pages` |
| query_id | 404 / GraphQL error | query ID not valid | run `xkit query-ids --fresh` |
| dependency | 5xx | upstream unavailable | retry later; check network |
| validation | CLI arg/config error | not-valid input | run `xkit <command> --help` |

---

## 10) Performance Requirements / SLAs or SLOs (Required)

| SLI | Target | Measurement |
| --- | ---: | --- |
| p95 latency (read/search) | <= 2000 ms | local timing logs |
| availability (CLI success) | >= 97% | opt-in telemetry or manual logs |
| throughput | 1 command/sec | local timing logs |

## 10b) SLOs and Error Budget (Required or N/A with reason)
- SLIs chosen: p95 latency, CLI success rate  
- SLO targets: 2s p95, 97% success rate  
- Error budget window: 30 days  
- Error budget policy: at 50% budget use pause non-critical changes; at 75% budget use focus on reliability; at 100% budget use pause releases  

---

## 11) Observability (Required)

* Logging:
  * Required fields: command, status, error_code, duration_ms
* Metrics:
  * Counters: commands_total, errors_total
  * Histograms: command_latency_ms
* Tracing: N/A (CLI)
* Dashboards: N/A (local)
* Alerts: N/A (no on-call; rely on manual review)

### Telemetry decision (required)
- Default: turned off.
- Optional: local-only counters stored on disk; no network transmission.
- Open decision: whether to support explicit opt-in network telemetry (see Open Questions).

---

## 12) Testing Strategy (Required)

* Unit tests: existing vitest suite
* Integration tests: CLI command tests in `tests/`
* E2E tests: `pnpm test:live` for live endpoint smoke tests
* Load tests: N/A (single-user CLI)
* Security tests: dependency audits via standard npm tooling
* Test data strategy: fixtures with redacted content

---

## 13) Deployment Strategy (Required)

* Build & release: changesets + `pnpm build` + npm publish
* Rollout: phased via npm versioning; Homebrew tap updates
* Feature flags: N/A
* Backward compatibility: JSON schema stays stable; breaking changes require a major version and migration notes
* Rollback: revert release and publish patch; add warning in README
* Post-deploy verification: run `pnpm test` and manual `xkit check`

---

## 14) Migration Plan (if applicable)
N/A (no persistent service migration).

---

## 15) Operational Notes (Recommended)

* Runbook: document query ID refresh and cookie troubleshooting in docs.
* Manual operations: rerun archive, delete corrupted outputs, reinitialize config.
* Support playbook: common errors point to `xkit check` and `xkit query-ids --fresh`.
* On-call readiness: N/A.

---

## Risks and Mitigations
- Risk: X GraphQL changes break commands.
  - Mitigation: query ID refresh + runbook + clear error guidance.
- Risk: Cookie auth gets blocked.
  - Mitigation: document “pause” threshold and alternative cookie sources if available.
- Risk: JSON schema changes break scripts.
  - Mitigation: stable schema versioning and major release process.

---

## 16) Open Questions / Future Considerations (Required)

### Open questions
* Q1: Should telemetry stay local-only, or support explicit opt-in network telemetry? (Owner: Jamie, Due: 2026-01-20)
* Q2: Where should runbook live (README vs docs/)? (Owner: Jamie, Due: 2026-01-20)

### Future considerations
* Optional archive exports (JSON) for integration with other tools.

---

## 17) Tech Spec Quality Gate (Required)

* [x] Architecture reads clear and diagrammed
* [x] Every stateful component has a state machine (or N/A + reason)
* [x] APIs have complete schemas + errors
* [x] Data model includes constraints and indexes
* [x] List security threats and mitigations
* [x] Error handling covers timeouts, retries, idempotency, degraded modes
* [x] Performance targets use numeric values and measurable targets
* [x] Observability includes logs, metrics, dashboards, alerts
* [x] Deployment stays repeatable and rollbackable
* [x] No ambiguity left for implementers

**Adversarial Review Findings (2026-01-19):**
- ⚠️ CRITICAL: New security threats from Ollama integration not professionally assessed
- ⚠️ HIGH: Performance targets unverified - no actual measurements collected
- ⚠️ MEDIUM: Resource limits for AI processing not defined
- ⚠️ MEDIUM: Content sanitization before AI processing not implemented

**Quality Gate Status:** ⚠️ **CONDITIONAL PASS** - Tech Spec is complete and well-structured, but Phase 1 introduced security and operational concerns that must be addressed before production use.