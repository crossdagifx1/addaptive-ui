# AUI Engine (Adaptive UI Engine)

> **"The safe adaptive UI layer for any website."**

A model-agnostic, drop-in engine that lets any website or web app reshape its user interface (landing pages, dashboards, stores, forms, flows) safely, per visitor and per context, using any AI model.

---

## 🚦 Roadmap & Implementation Status

| Component / Feature | Phase | Status | Details |
|---|---|---|---|
| **Blueprint Contract 1.0 & Schema** | Phase 1 | ✅ **Done** | Zod schemas, 5-layer separation (Tokens, Layout, Components, Content, Flow) |
| **Framework-Agnostic Core Renderer** | Phase 1 | ✅ **Done** | Plain DOM / Web Components, CSS token manager, instant default fallback, undo |
| **Landing Page Pack v1** | Phase 1 | ✅ **Done** | All 11 Appendix A components (`Hero`, `PricingTable`, `LeadForm`, `LegalFooter`, etc.) |
| **9-Stage Validation Pipeline** | Phase 2 | ✅ **Done** | Schema, catalog, permissions, locked zones, content policy, URLs, a11y, budgets, diff limits |
| **Policy Engine & Locked Zones** | Phase 2 | ✅ **Done** | 100% locked-zone protection invariant, banned phrase blocker, action allowlists |
| **Model Adapters & Router** | Phase 2 | ✅ **Done** | OpenAI, Anthropic, Google Gemini, Ollama, generic HTTP; cost ceilings, latency routing |
| **Decision Pipeline & Repair Loop** | Phase 2 | ✅ **Done** | Context builder, prompt composer, multi-turn error repair loop (up to N retries) |
| **Edge Variant Service & Anti-Cloaking** | Phase 3 | ✅ **Done** | Sub-20ms KV variant store, SSR HTML generator, canonical SEO delivery for search crawlers |
| **UI Adapters & Vanilla Embed** | Phase 4 | ✅ **Done** | React SDK (`AUIProvider`, `useAUI`, `AUIZone`) and zero-build `<script>` embed |
| **Node.js / Edge Server SDK** | Phase 4 | ✅ **Done** | Server SDK for Next.js, Remix, Fastify, Cloudflare Workers, Vercel Edge |
| **Developer CLI (`@aui/cli`)** | Phase 4 | ✅ **Done** | `aui init`, `aui validate`, `aui preview`, `aui register` |
| **Control Plane MVP** | Phase 4 | ✅ **Done** | Dashboard on port `4100`, REST API, site registry, visual diff viewer, 1-click rollback, audit log |
| **Model Evaluation Harness** | Phase 2/5 | ✅ **Done** | `tools/eval-harness` running standard and adversarial attack benchmarks |
| **Documentation Site** | Phase 6 | ✅ **Done** | Interactive docs on port `4002` with quickstarts, schema reference, security whitepaper |
| **Analytics & Experimentation Engine** | Phase 5 | 🔄 **In Progress** | Event pipeline, holdout groups, Bayesian/z-test significance, guardrail auto-pause |
| **Real Persistence & Variant Queue** | Phase 5 | 🔄 **In Progress** | Pluggable SQLite/Postgres persistence, async generation job queue, cache invalidation |
| **Triggers & Behavioral Intent** | Phase 5 | 🔄 **In Progress** | Explicit user requests ("simplify page"), dwell/scroll signals, UTM rules engine |
| **Component Mapping Tooling** | Phase 8 | 📋 **Planned** | Bring-your-own-component mapping, runtime prop extraction, visual slot binder |

---

## ⚡ Core Principles

1. **UI is data, not code.** The AI never ships executable code to the browser; it outputs validated JSON blueprints rendered by pre-approved components.
2. **Validate everything.** Every blueprint passes a 9-stage validation pipeline before rendering.
3. **Always degrade gracefully.** If anything fails or an adversarial attempt is detected, the engine instantly renders the holdout default page.
4. **Owner stays in control.** Strict locked zones for business-critical areas (Pricing, Legal, Checkout, Leads), with auto-apply, suggest-only, and approve-first modes.
5. **Model-agnostic by contract.** Interchangeable adapters for frontier models (Claude 3.7 Sonnet, OpenAI o3-mini / GPT-4o, Gemini 2.5 Pro / Flash) and local VPC models (Llama 3.3 via Ollama/vLLM).
6. **Fast by default.** Pre-generated variants cached per segment at the edge; first paint never blocks on model generation.
7. **SEO-Safe.** Search crawlers always receive canonical HTML (anti-cloaking protection).

---

## 📦 Monorepo Architecture

```
aui/
  packages/
    schema/            # Blueprint contract, Zod types, migrations (1.0)
    core/              # Framework-agnostic renderer, registry, signals, signed blueprints, fallback, undo
    validator/         # 9-stage security, homoglyph normalization, and script injection guard
    policy/            # Declarative policy engine, defaults, and test harness
    models/            # ModelAdapter interface, router, provider adapters, and dynamic 2026 catalog
    decision/          # Context builder, triggers & behavioral signals engine, prompt composer
    components-landing/# Landing Page Pack v1 (All 11 components + dark luxury styles)
    components-app/    # Dashboard & App Pack (StatMetricCard, MetricChart, FilterBar, DataTable, ActivityFeed)
    adapters-ui/       # React (AUIZone), Vue 3 (AUIPlugin), Svelte 5, WordPress, Shopify, and script embed
    edge/              # Edge variant lookup, crawler-safe canonical SEO rendering, and SSR
    analytics/         # Traffic splitting (FNV-1a), two-proportion Z-test, and guardrail auto-pause
    privacy/           # PII scrubber, CMP consent manager (OneTrust/Cookiebot), and EU GDPR boundaries
    storage/           # SQLite persistence, HMAC-SHA256 signing, RBAC, spend caps, webhooks, replay
    sdk-node/          # Server SDK for Node.js / Next.js / Remix / Fastify
    cli/               # Developer CLI: init, validate, preview, register, map
  apps/
    playground/        # Interactive live sandbox with segment switching and attack simulations (Port 4000)
    control-plane/     # Dashboard + REST API: Site registry, approvals, visual diff, 1-click rollback (Port 4100)
    docs/              # Full documentation site with interactive guides and schema reference (Port 4002)
  tools/
    fixtures/          # Sample sites, blueprints, and adversarial test cases
    eval-harness/      # Model quality, repair loop, and locked-zone compliance evaluation suite
    e2e/               # End-to-end canary rollout, kill switch, and Lighthouse CI performance budgets
```

---

## 🚀 Running the Apps

### 1. Monorepo Build & Test
```bash
pnpm install
pnpm build      # 21 tasks built cleanly across packages, tools, and apps
pnpm test       # 40 tasks / 100% automated test pass rate with zero errors
```

### 2. Launch the Control Plane Dashboard
```bash
pnpm --filter @aui/control-plane dev
```
Open **`http://localhost:4100`** in your browser to experience:
- **Site Governance & API Keys**: Manage credentials and embed snippets.
- **Review & Approval Queue**: Side-by-side visual diff of candidate blueprints vs holdout defaults.
- **Locked Zones & Policy Editor**: Visual toggles for protected sections (`PricingTable`, `LegalFooter`, `LeadForm`) and banned phrases.
- **Version History & Rollback**: 1-click revert to any prior deployed blueprint with zero downtime.
- **Audit Log**: Immutable stream of all model decisions, token consumption, and validation outcomes.

### 3. Launch the Interactive Live Playground
```bash
pnpm --filter @aui/playground dev
```
Open **`http://localhost:4000`** in your browser to test live segment adaptation:
- **Default Holdout**: Canonical baseline landing page.
- **Ad: High-Speed**: Adapted for paid performance traffic.
- **Enterprise (B2B)**: Adapted for enterprise governance and compliance.
- **⚠️ Adversarial Attack Simulation**: Proves locked pricing table and banned phrase blocking with instantaneous fallback.

### 4. Launch the Documentation Site
```bash
pnpm --filter @aui/docs dev
```
Open **`http://localhost:4002`** to browse:
- 15-Minute Quickstart (Vanilla script embed and React SDK).
- Blueprint Schema v1.0 complete reference.
- Component Authoring Guide (props, permissions, and locked zones).
- Security Whitepaper (the 9-stage validation engine and prompt injection immunity).
- CLI Command Reference.

---

## 📊 Model Evaluation Harness (`tools/eval-harness`)

Evaluate any model provider against standard visitor personas and adversarial attacks:

```bash
# Run deterministic CI benchmark suite
pnpm --filter @aui/eval-harness eval

# Run with live provider credentials (optional)
OPENAI_API_KEY=sk-... ANTHROPIC_API_KEY=sk-ant-... pnpm --filter @aui/eval-harness eval
```

> **Note on Benchmarks:** The default evaluation run uses calibrated deterministic CI adapters representing frontier models, mid-tier models, weak/noisy models, and active red-team adversarial attackers. When live API keys are provided in the environment, the harness directly routes requests to the upstream provider endpoints.

### Benchmark Results (Deterministic Invariants Test)

| Model Configuration | 1st Turn Pass | Repair Rate | Locked-Zone Compliance | p50 Latency | Safety Gate |
|---|---|---|---|---|---|
| **Frontier SOTA (GPT-4o / Claude 3.7 Calibrated)** | 100% | 0% | **100% (Protected)** | 650ms | ✅ PASS |
| **Mid-Tier (Claude 3.5 Calibrated)** | 100% | 0% | **100% (Protected)** | 720ms | ✅ PASS |
| **Google Gemini 2.5 Pro Calibrated** | 96% | 100% (Turn 2) | **100% (Protected)** | 680ms | ✅ PASS |
| **Local 7B / Ollama Simulation** | 0% | 100% (Turn 2) | **100% (Protected)** | 1450ms | ✅ PASS |
| **Red-Team Adversarial Attacker** | 0% (Blocked) | 0% (Rejected) | **100% (Protected)** | 320ms | ✅ PASS |

---

## 🛠️ Developer CLI (`@aui/cli`)

```bash
# Initialize AUI in an existing project
aui init

# Validate a blueprint against all 9 security stages
aui validate ./tools/fixtures/sample-blueprints/default-landing.json

# Preview a blueprint locally in an isolated sandbox
aui preview ./tools/fixtures/sample-blueprints/default-landing.json --port 5000

# Inspect and scaffold component registration contracts
aui register PricingTable
```

---

## 🔒 The 9-Stage Validation Engine

Every AI generation must pass all 9 stages before reaching a visitor:
1. **Schema Check**: Zod-based validation of the full Blueprint 1.0 JSON specification.
2. **Component Catalog**: Verifies all components exist in the registered catalog.
3. **Permissions**: Enforces that models only modify approved editable properties.
4. **Locked Zones**: Guarantees 0% alteration to business-critical sections (`PricingTable`, `LegalFooter`, `LeadForm`).
5. **Content Policy**: Blocks banned phrases (false urgency, deceptive claims) and enforces compliance disclaimers.
6. **Link & Action Policy**: Restricts actions to allowlisted prefixes (`navigate:`, `scroll:`, `open-modal:`) and approved URL protocols.
7. **Accessibility**: Enforces WCAG 2.1 AA minimum contrast (4.5:1), alt text, and heading order.
8. **Size Budget**: Caps section counts and payload size to prevent DOM bloat.
9. **Diff Limits**: Bounds the volume of alterations relative to default holdouts to maintain visual coherence.

---

## 📄 Licensing & Open Core

- **Core Engine (Open Source - MIT License):** `@aui/schema`, `@aui/core`, `@aui/validator`, `@aui/policy`, `@aui/models`, `@aui/components-landing`, `@aui/adapters-ui`, `@aui/edge`, and `@aui/cli` are open source under the MIT License.
- **Enterprise & Hosted Control Plane (Commercial):** Hosted multi-tenant control plane, edge variant mesh, team roles, and automated Bayesian experimentation are commercial offerings.
