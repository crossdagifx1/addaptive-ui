# Adaptive UI Engine: Development and Technical Plan

**Working name:** AUI Engine (rename later)
**Document version:** 1.0
**Date:** October 22, 2026
**Status:** Planning

---

## 1. Vision and Scope

### 1.1 One-line vision
A model-agnostic, drop-in layer that lets any website or web app reshape its own user interface (landing pages, dashboards, stores, forms, flows) safely, per visitor and per context, using any AI model.

### 1.2 What it is
- A **framework/plugin** that sits on top of a site.
- It does **not** let the AI write or run arbitrary code. The AI outputs a validated **blueprint** (structured JSON) that the engine renders using approved components.
- It works with **any AI model** (OpenAI, Anthropic, Google, open-source, local) through one adapter interface.
- It is **sold to developers and businesses**, who pay for the engine, the hosted control plane, and the measurable results.

### 1.3 What it is not
- Not an AI agent that takes actions on behalf of users.
- Not a website builder or a chatbot UI kit.
- Not a code generator that edits source files (v1).
- Not a self-modifying backend (deferred to a later module, see Phase 8).

### 1.4 Scope of v1 (full UI, landing-page-first)
The engine is general (any page type) but ships with a **Landing Page Pack** first, because landing pages tie directly to revenue and give the clearest proof of value.

### 1.5 Success criteria for v1
1. A developer can install the plugin on an existing site in under 15 minutes.
2. Any supported model can drive it; invalid output never breaks the page.
3. Customers can show a measurable lift (conversion, engagement) from adaptation.
4. Zero incidents where the AI changes locked content (pricing, legal, checkout).

---

## 2. Market Position and Differentiation

### 2.1 Competitive landscape (as of Oct 2026)
Existing generative-UI tools include Thesys C1 (API middleware, React SDK), OpenUI (open standard), Vercel json-render, Google A2UI/GenUI, and CopilotKit. Most target **chat and agent apps** and are **React-centric**.

### 2.2 Where this product differs
| Area | Typical competitors | AUI Engine |
|---|---|---|
| Target | AI answers rendered as UI in chat | The whole site, per visitor and context |
| Framework | Mostly React | Framework-agnostic core (plain JS, web components) plus adapters |
| Safety | Basic validation | Locked zones, approval modes, rollback, audit log as a core feature |
| Models | Often via one gateway | Any model, with fallback and cost routing |
| Value proof | Developer convenience | Measured business lift (experimentation built in) |

### 2.3 Positioning statement
"The safe adaptive UI layer for any website."

---

## 3. Design Principles

1. **UI is data, not code.** The AI never ships executable code to the browser.
2. **Validate everything.** Every model output passes schema, policy, and accessibility checks before rendering.
3. **Always degrade gracefully.** If anything fails, render the default page instantly.
4. **Owner stays in control.** Auto-apply, suggest-only, and approve-first modes; locked zones; one-click undo.
5. **Model-agnostic by contract.** The engine defines the job; models are interchangeable workers.
6. **Fast by default.** Pre-generate and cache. Never block first paint on a model call.
7. **Restraint.** Change gradually and predictably so users are not confused.
8. **Observable.** Every AI decision is logged and replayable.
9. **Privacy-minded.** Send the minimum context to models; support customer-owned keys and local models.
10. **Versioned contracts.** Schemas and APIs are versioned from day one.

---

## 4. System Architecture

### 4.1 High-level diagram

```
                      +--------------------------------------+
                      |           CONTROL PLANE              |
                      |  Dashboard | Policies | Analytics    |
                      |  Blueprint store | Audit log | Auth  |
                      +------------------+-------------------+
                                         |
                         (config, policies, blueprints, events)
                                         |
+----------------+     +-----------------v------------------+     +-------------------+
|  CUSTOMER SITE |     |           DECISION SERVICE         |     |   MODEL PROVIDERS |
|                |     |  Signal intake                     |     |  OpenAI           |
|  Client SDK    +---->+  Context builder                   +---->+  Anthropic        |
|  (renderer,    |     |  Prompt composer                   |     |  Google           |
|  signals,      |<----+  Model router + adapters           |<----+  Open-source      |
|  fallback)     |     |  Validator + policy engine         |     |  Local models     |
|                |     |  Cache + variant store             |     +-------------------+
+-------+--------+     +------------------------------------+
        |
        v
  Edge/SSR renderer (SEO-safe, fast first paint)
```

### 4.2 Main components
1. **Client SDK** (browser): renders blueprints, collects signals, handles fallback and undo.
2. **Edge/SSR Renderer**: renders blueprints on the server or edge for SEO and speed.
3. **Decision Service**: turns context and signals into a validated blueprint using a model.
4. **Model Adapter Layer**: uniform interface to any AI model.
5. **Validator and Policy Engine**: schema, safety, brand, accessibility, locked-zone checks.
6. **Cache and Variant Store**: pre-generated blueprints keyed by segment.
7. **Control Plane**: dashboard, policies, approvals, analytics, billing.
8. **Analytics and Experimentation**: measures whether adaptations improve outcomes.

### 4.3 Request lifecycle (landing page example)
1. Visitor requests the page. The edge identifies a **segment key** (referrer, campaign, device, language, returning vs new).
2. Edge looks up a cached, approved blueprint for that segment.
3. **Cache hit:** render immediately (server-side), hydrate on the client.
4. **Cache miss:** render the **default blueprint** immediately and enqueue an async generation job for that segment.
5. Decision Service builds context, calls the model, validates output, runs policy checks.
6. If the mode is auto-apply and checks pass, the blueprint is stored and used for future visitors in that segment. If approve-first, it is queued in the dashboard.
7. Client SDK sends engagement signals; analytics attributes outcomes to the blueprint version.

Key rule: **the model is never on the critical path of first paint.**

---

## 5. Core Concepts and Data Model

### 5.1 Five control layers
1. **Design tokens:** colors, typography, spacing, radius, shadows, motion.
2. **Layout:** grids, sections, responsive rules, ordering.
3. **Components:** the approved library (hero, pricing, testimonials, forms, charts, nav, modal, etc.).
4. **Content:** copy, images, tone, language, reading level.
5. **Flow:** navigation, multi-step journeys, conditional steps.

Each layer has its own **permission level** (owner decides what the AI may change).

### 5.2 Blueprint (the central contract)
A blueprint is a JSON document describing a page.

```json
{
  "schemaVersion": "1.0",
  "blueprintId": "bp_8f21c",
  "pageId": "landing-home",
  "segment": "ref:google-ads|device:mobile|lang:en|new",
  "tokens": {
    "color.primary": "token:brand.blue",
    "font.heading": "token:font.display",
    "density": "comfortable"
  },
  "layout": {
    "type": "stack",
    "sections": ["hero", "social-proof", "features", "pricing", "faq", "cta"]
  },
  "components": {
    "hero": {
      "type": "Hero",
      "props": {
        "headline": "Launch your store in 10 minutes",
        "subheadline": "No code. No credit card.",
        "primaryCta": { "label": "Start free", "action": "navigate:/signup" }
      }
    },
    "pricing": { "type": "PricingTable", "locked": true, "ref": "default" }
  },
  "flow": { "onPrimaryCta": "navigate:/signup" },
  "meta": {
    "generatedBy": "model:adapter-x",
    "reasoning": "Visitor came from ad about speed; emphasize time-to-launch.",
    "createdAt": "2026-10-22T10:00:00Z"
  }
}
```

### 5.3 Component registry
Every component is registered with:
- `type` (unique name)
- `propsSchema` (JSON Schema)
- `slots` (named child areas)
- `permissions` (which props the AI may change)
- `a11yRules` (required labels, contrast, focus behavior)
- `variants` (named visual variants)
- `lockedByDefault` (boolean)

### 5.4 Locked zones
Marked in config or inline. Examples: pricing, legal text, consent banners, login, checkout, payment fields. The renderer **ignores any AI change** to a locked zone, and the validator rejects the blueprint if it tries.

### 5.5 Segments
A segment is a set of conditions that map visitors to a blueprint (for example `ref:google-ads`, `device:mobile`, `returning:true`, `lang:fr`). Segments keep the number of generated variants bounded and cacheable.

### 5.6 Versioning
- `schemaVersion` on every blueprint.
- Migration functions between schema versions.
- Blueprint history with parent links for rollback.

---

## 6. Model Adapter Layer

### 6.1 Goal
Any model, same contract. The engine never contains provider-specific logic outside adapters.

### 6.2 Adapter interface (TypeScript)

```ts
interface ModelAdapter {
  id: string;
  capabilities: {
    structuredOutput: "native" | "prompted" | "none";
    maxContextTokens: number;
    supportsStreaming: boolean;
    supportsImages: boolean;
  };
  generate(request: GenerateRequest): Promise<GenerateResult>;
  estimateCost(request: GenerateRequest): CostEstimate;
}

interface GenerateRequest {
  system: string;
  input: string;            // composed context + instructions
  outputSchema: object;     // JSON Schema for the blueprint
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs: number;
}

interface GenerateResult {
  raw: string;
  parsed?: unknown;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}
```

### 6.3 Built-in adapters (v1)
- OpenAI-compatible (covers many providers and local servers)
- Anthropic
- Google
- Generic HTTP adapter (customer-defined endpoint)
- Local (Ollama/llama.cpp style, via OpenAI-compatible endpoint)

### 6.4 Handling weak models
- **Native structured output** where available.
- **Prompted JSON + repair loop** otherwise: parse, validate, send errors back for up to N retries.
- **Constrained mode for small models:** reduce the task (change only copy and tokens, not layout).
- **Fallback chain:** model A, then model B, then default blueprint.

### 6.5 Model router
Routes by rules: task type, cost ceiling, latency budget, customer preference, health. Supports A/B routing between models and per-customer model allowlists.

### 6.6 Customer-owned keys
Customers can supply their own provider keys (stored encrypted, scoped, rotatable) or run models in their own infrastructure. Required for enterprise privacy.

---

## 7. Decision Service

### 7.1 Pipeline
1. **Signal intake:** normalized events (page, referrer, campaign, device, locale, behavior).
2. **Context builder:** assembles a minimal, privacy-filtered context.
3. **Constraint builder:** lists allowed components, tokens, locked zones, brand voice rules, legal rules.
4. **Prompt composer:** builds the system prompt and input (templates are versioned).
5. **Model call** through the router.
6. **Parse and repair.**
7. **Validate** (schema, policy, a11y, brand, diff size).
8. **Score** (optional second pass, cheap model or rules, for quality and risk).
9. **Store or queue** depending on approval mode.

### 7.2 Prompt design rules
- The prompt states the component catalog and schema explicitly.
- The model must return **only** a blueprint (no prose).
- Include the **default blueprint** and ask for a *diff-style* or *full* result depending on mode (diffs are cheaper and safer).
- Include brand voice and forbidden claims.
- Never include raw personal data; include segment attributes only.

### 7.3 Diff-based generation
Prefer asking the model for a **patch** against the default blueprint (JSON Patch). Benefits: fewer tokens, easier validation, bounded change size, simpler review UI.

### 7.4 Restraint rules (engine-enforced)
- Max changes per generation (configurable).
- Never move primary navigation.
- Never change more than X% of sections for a returning visitor.
- Cooldown between adaptations per user.

---

## 8. Validator and Policy Engine

### 8.1 Validation stages (all must pass)
1. **Schema:** JSON Schema validation of the whole blueprint.
2. **Component check:** only registered components; props match schemas.
3. **Permission check:** AI may only change permitted layers/props.
4. **Locked-zone check:** no modification to locked content.
5. **Content policy:** banned phrases, required disclaimers present, claim rules (for example no invented discounts, no false urgency).
6. **Link and action policy:** actions limited to an allowlist (`navigate:`, `scroll:`, `open-modal:`); external URLs allowlisted.
7. **Accessibility check:** contrast ratios, heading order, labels, focus order, motion-reduction support.
8. **Size and performance budget:** DOM node count, image weight, number of sections.
9. **Diff-size check:** change relative to default is within limits.

### 8.2 Policy as code
Policies are declarative rules stored in the control plane (JSON/YAML), versioned, and testable.

```yaml
policy:
  locked: [pricing, legal-footer, checkout]
  bannedPhrases: ["guaranteed results", "limited time only"]
  requiredElements: [privacy-link, cookie-consent]
  allowedActions: [navigate, scroll, open-modal]
  maxSectionChanges: 3
  a11y: { minContrast: 4.5, requireAltText: true }
```

### 8.3 Failure behavior
Any failure: reject the blueprint, log reason, retry or fall back to default. Never partially apply.

---

## 9. Client SDK and Renderer

### 9.1 Technology choices
- **Core renderer:** TypeScript, framework-agnostic, built on **web components** for portability.
- **Adapters:** React, Vue, Svelte, and a plain `<script>` embed.
- **Overlay mode:** applies approved patches to existing DOM regions marked with attributes (for example `data-aui-zone="hero"`).

### 9.2 Integration modes
1. **Component mapping (primary):** customer registers their own components with prop schemas; the engine composes pages from them. Site keeps its look.
2. **Hosted component packs:** use the engine's provided components (fastest start).
3. **Overlay mode (easy on-ramp):** zone-based adjustments on an existing page without a rebuild.

### 9.3 Install experience (target)

```html
<script src="https://cdn.example.com/aui.js" data-site="SITE_ID" async></script>
```

Plus optional config file for component registration and locked zones.

### 9.4 Client responsibilities
- Render blueprint or fall back to default.
- Collect consented signals (clicks, scroll depth, dwell, errors).
- Provide **"Reset to default"** and optional **"Why am I seeing this?"** controls.
- Respect `prefers-reduced-motion`, `prefers-color-scheme`, consent state.
- Prevent layout shift (reserve space, no flash of default content before swap).

### 9.5 Edge/SSR rendering
- Render blueprints server-side or at the edge for SEO and fast first paint.
- Serve a **stable canonical version** to crawlers (the default or most common segment) to avoid cloaking issues.
- Support streaming HTML where the platform allows.

### 9.6 Avoiding flicker and layout shift
- Decide the variant at the edge before HTML is sent.
- Use CSS variables for token swaps (no re-render).
- Reserve dimensions for swappable media.

---

## 10. Signals and Triggers

### 10.1 Trigger tiers (roll out in this order)
1. **Explicit:** user types "make this simpler" or "show prices only."
2. **Context:** referrer, campaign/UTM, device, locale, time, connection speed, accessibility preferences.
3. **Behavioral:** scroll depth, rage clicks, repeated back-and-forth, drop-off points, search terms.
4. **Inferred goals:** model-assisted guess of intent (opt-in, privacy reviewed).

### 10.2 Signal schema
Normalized event format with timestamp, session id (pseudonymous), page id, event type, and non-identifying properties.

### 10.3 Privacy rules
- No raw PII to models by default.
- Consent-aware collection (integrates with consent platforms).
- Configurable data retention.
- Regional processing options (EU data stays in EU).

---

## 11. Caching, Performance, and Cost

### 11.1 Caching strategy
- **Variant cache:** keyed by `(site, page, segment, blueprintVersion)`.
- **Edge cache** for rendered HTML per variant.
- **Negative cache** for failed generations (avoid retry storms).
- **Warm-up:** pre-generate for top segments on deploy or on schedule.

### 11.2 Performance budgets
| Metric | Target |
|---|---|
| SDK size (core) | under 30 KB gzipped |
| Added time to first byte (edge variant lookup) | under 20 ms |
| Largest Contentful Paint regression | none vs default |
| Cumulative Layout Shift added | 0 |
| Model call on critical path | never |

### 11.3 Cost control
- Generate per **segment**, not per visitor.
- Use diff generation and smaller models where possible.
- Per-site monthly spend caps and alerts.
- Cost attribution per customer, page, and model in the control plane.

---

## 12. Control Plane (Dashboard and API)

### 12.1 Features (by priority)
1. Site setup, install snippet, API keys.
2. Component registry and locked-zone editor.
3. Mode selection: **auto-apply**, **suggest-only**, **approve-first**.
4. Blueprint review UI with **visual diff** against default.
5. Version history with one-click rollback.
6. Policy editor and tester.
7. Model settings (providers, keys, routing, budgets).
8. Audit log (who/what changed, which model, which prompt version).
9. Analytics and experiment results.
10. Team roles and permissions; billing.

### 12.2 API
Public REST/JSON API for blueprints, policies, components, events. Webhooks for "blueprint pending approval," "blueprint applied," "policy violation."

### 12.3 Roles
Owner, Admin, Editor (can approve), Viewer, Developer (can edit registry and policies).

---

## 13. Analytics and Experimentation

### 13.1 Why this is core
Adaptive UI must prove it works. Measured lift is the main reason customers pay.

### 13.2 Capabilities
- Always keep a **holdout group** that sees the default page.
- Attribute conversions to **blueprint version and segment**.
- Statistical significance reporting (with sequential testing to avoid false wins).
- Guardrail metrics (bounce rate, errors, page speed) that auto-pause a variant if harmed.
- Goal definition: signup, purchase, click, custom event.

### 13.3 Learning loop (later phase)
Feed outcomes back as context: "variants emphasizing speed won for ad-traffic mobile." Start with human-readable insights, then evolve into automated bandit-style selection among approved variants.

---

## 14. Security and Compliance

### 14.1 Threat model highlights
| Threat | Mitigation |
|---|---|
| Prompt injection via page content or user input | Treat all external text as untrusted data; separate instructions from data; output is validated, so injection cannot create new capabilities |
| Model outputs malicious HTML/JS | Blueprint has no raw HTML/JS; text is escaped; rich text uses a safe subset |
| Malicious links/actions | Action and URL allowlists |
| Tampered blueprints in transit | Signed blueprints; verify signature in the SDK |
| Key leakage | Server-side calls only; encrypted key storage; scoped, rotatable keys |
| Tenant data leakage | Strict tenant isolation in storage and caches |
| Abuse of generation endpoint | Rate limiting, per-site quotas, bot filtering |
| Supply-chain attacks on the SDK | Signed releases, SRI hashes, dependency pinning and audit |

### 14.2 Compliance roadmap
- GDPR/CCPA readiness (data minimization, deletion, consent integration).
- Data processing agreements, subprocessor list.
- SOC 2 Type I, then Type II (for enterprise sales).
- Audit logs retained per customer policy.

### 14.3 Content-safety responsibilities
Clear terms stating customers own the policies they configure; engine ships sensible defaults against deceptive claims and dark patterns.

---

## 15. Technology Stack (proposed)

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript everywhere | Shared types for schema, SDK, services |
| Monorepo | pnpm workspaces + Turborepo | Fast, simple |
| Schema | JSON Schema + Zod (generated types) | Validation shared by client, server, models |
| Client core | Web components, vanilla TS | Framework independence |
| Adapters | React, Vue, Svelte | Reach |
| Edge | Cloudflare Workers / Vercel Edge (abstracted behind an interface) | Low-latency variant lookup |
| API/services | Node.js (Fastify or Hono) | Fast, flexible |
| Database | PostgreSQL | Blueprints, configs, audit, billing |
| Cache | Redis + CDN/edge KV | Variant cache |
| Queue | Redis-based queue or managed queue | Async generation |
| Analytics store | ClickHouse or a managed alternative | High-volume events |
| Dashboard | React + a component kit | Fast to build |
| Auth | Managed auth provider | Avoid building it |
| Observability | OpenTelemetry + a tracing/log platform | Replayable AI decisions |
| CI/CD | GitHub Actions | Standard |
| Docs | Docusaurus or similar | Developer-friendly |

Keep platform-specific code behind interfaces so you can change vendors.

---

## 16. Repository Structure

```
aui/
  packages/
    schema/            # blueprint schema, JSON Schema, Zod types, migrations
    core/              # renderer, registry, signals, fallback, undo
    adapters-ui/       # react, vue, svelte, script-embed
    components-landing/# Landing Page Pack
    components-app/    # Dashboard/App Pack (later)
    models/            # model adapter interface + provider adapters
    validator/         # schema, policy, a11y, diff checks
    policy/            # policy language, defaults, test harness
    decision/          # context builder, prompt composer, router
    edge/              # edge/SSR renderer + variant lookup
    sdk-node/          # server SDK for customers
    cli/               # init, validate, preview, register components
  apps/
    control-plane/     # dashboard + API
    docs/              # documentation site
    playground/        # live demo + sandbox
  tools/
    eval-harness/      # model quality evaluation
    fixtures/          # sample sites, blueprints, adversarial cases
```

---

## 17. Phased Roadmap

Time estimates assume a small team (see Section 21). Adjust as needed.

### Phase 0: Validation (Weeks 1-3)
**Goal:** confirm someone will pay before building deeply.
- Build a throwaway demo: one landing page, 6 components, one model, hardcoded schema.
- Interview 15-20 developers/marketers (landing page owners, agencies, SaaS teams).
- Define the sharpest first use case and price expectations.
- Decide name, domain, licensing approach.

**Exit criteria:** at least 5 prospects willing to join a pilot; at least 2 willing to pre-commit or give a letter of intent.

### Phase 1: Schema and Core Renderer (Weeks 3-8)
**Deliverables**
- Blueprint schema v1 (tokens, layout, components, content, flow).
- Component registry with prop schemas and permissions.
- Core renderer (web components) with fallback to default and undo.
- 10-15 landing components (hero, features, testimonials, logos, pricing, FAQ, CTA, form, footer, nav, banner).
- Design token system with CSS variables.
- Validator v1 (schema, component, permission, locked zone).
- CLI for local preview and validation.

**Exit criteria:** a hand-written blueprint renders correctly; invalid blueprints fall back safely; test suite passing.

### Phase 2: Model Adapters and Decision Service (Weeks 8-13)
**Deliverables**
- Model adapter interface plus OpenAI-compatible, Anthropic, and Google adapters.
- Repair loop and fallback chain.
- Context builder, constraint builder, prompt composer (versioned templates).
- Diff-based generation (JSON Patch) and full-blueprint mode.
- Eval harness: scores each model on validity rate, policy compliance, quality.
- Model router v1.

**Exit criteria:** at least 3 models produce valid blueprints at greater than 95% (strong models) and greater than 70% with repair (weaker models); zero locked-zone violations in adversarial tests.

### Phase 3: Edge, Caching, and Landing Page Pack (Weeks 13-18)
**Deliverables**
- Edge/SSR renderer with segment-based variant lookup.
- Variant cache, async generation queue, negative cache.
- Crawler-safe canonical rendering.
- Landing Page Pack v1: 3 page templates, 15+ sections, segment presets (ad referrer, device, returning).
- Performance budgets enforced in CI.

**Exit criteria:** LCP and CLS equal or better than default pages; first paint never waits on a model.

### Phase 4: Control Plane MVP (Weeks 18-24)
**Deliverables**
- Auth, sites, API keys, install snippet.
- Mode selection (auto-apply, suggest-only, approve-first).
- Blueprint review UI with visual diff; version history and rollback.
- Policy editor; locked-zone editor.
- Basic audit log.
- Model settings and spend caps.

**Exit criteria:** a non-engineer owner can set up policies, review a variant, approve it, and roll it back.

### Phase 5: Analytics and Experimentation (Weeks 24-30) — ✅ COMPLETE
**Deliverables**
- Event pipeline and goal definitions (`@aui/analytics/src/pipeline.ts`).
- Holdout groups, attribution, significance reporting with two-proportion Z-test (`@aui/analytics/src/significance.ts`).
- Guardrail metrics with auto-pause for bounce rate, error rate, and latency regression (`@aui/analytics/src/guardrails.ts`).
- Deterministic FNV-1a traffic splitting for holdouts and canary rollouts (`@aui/analytics/src/traffic.ts`).
- Dashboard reports with lift calculation, confidence intervals, and one-click controls in Control Plane UI.

**Exit criteria met:** Defensible lift reporting and automatic guardrail tripwires fully operational and tested.

### Phase 6: Private Beta and Hardening (Weeks 30-38) — ✅ COMPLETE
**Deliverables**
- **Security & Red-Team Suite:** Adversarial jailbreak and prompt-injection red-team suite in `@aui/eval-harness` and `@aui/validator` (blocking locked-zone mutation, Unicode homoglyphs, XSS script injection, and malicious URL schemes).
- **Signed Blueprints:** Cryptographic HMAC-SHA256 signature verification in transit for client SDK (`@aui/core`) and backend storage (`@aui/storage`).
- **Privacy & Compliance Engine (`@aui/privacy`):**
  - High-precision PII scrubber (redacts email, phone, SSN, credit cards, IPv4/IPv6, API tokens, authorization headers).
  - Consent management integration (OneTrust, Cookiebot, TCF v2.2, custom flags).
  - Regional data boundaries (EU GDPR data boundary enforcement, country-level routing to `eu-west-1` or local model endpoints).
  - Data retention & GDPR Right to be Forgotten purge utilities.
- **Enterprise Controls & Observability (`@aui/storage` + `apps/control-plane`):**
  - Spend caps and real-time alerts ($ monthly cap, 80% warning threshold, 100% auto-pause).
  - HMAC signed Webhooks dispatcher (`blueprint.applied`, `guardrail.auto_paused`, `spend.threshold_reached`).
  - Logs replay engine (`GenerationTraceStore`) enabling deterministic replay of AI generations.
- **Expanded Adapters (`@aui/adapters-ui`):**
  - Vue 3 adapter (`useAUI()` composable, `AUIPlugin`, `<AUIZone>` component).
  - Svelte adapter (`createAUIStore()` auto-subscribable readable store).
  - WordPress PHP snippet and shortcode generator (`[aui_zone name="hero"]`).
  - Shopify Liquid section generator (`sections/aui-zone-{{name}}.liquid`) and customer tag segment extractor.
- **Dashboard & App Component Pack (`@aui/components-app`):**
  - Enterprise data-dense components (`AppNav`, `StatMetricCard`, `MetricChart`, `FilterBar`, `DataTable`, `ActivityFeed`).
  - Pre-assembled enterprise dashboard blueprint (`defaultDashboardBlueprint`).
- **E2E & Performance Budgets (`tools/e2e`):**
  - 5% canary rollout deterministic traffic allocation verification.
  - Emergency kill switch live disarming verification.
  - CI Lighthouse budgets: < 20ms added TTFB, CLS = 0, first paint never waiting on models.

**Exit criteria met:** 40/40 monorepo test tasks passing cleanly, zero locked-zone violations under red-team assault, and enterprise multi-framework coverage.

### Phase 7: Public Launch (Weeks 38-44) — 🚀 IN PROGRESS
**Deliverables**
- Open-source core release (MIT permissive core + commercial enterprise control plane).
- Launch campaign: demo site, benchmarks, case studies, live playground (`apps/playground`).
- Free tier plus paid Pro/Enterprise tiers live.
- WordPress and Shopify app directory submissions.

### Phase 8: Expansion (Month 11+)
- Dashboard/App Pack (data-heavy UIs).
- Component mapping tooling (auto-detect and register customer components).
- Learning loop and automated variant selection.
- Per-user personalization with memory (opt-in).
- Enterprise features: SSO, SOC 2, private deployment, custom models.
- **Backend adaptation module** (strictly sandboxed, separate product line).

---

## 18. Testing Strategy

### 18.1 Test layers
1. **Unit tests:** schema, validators, policy rules, adapters (mocked).
2. **Property-based tests:** random blueprints must never crash the renderer.
3. **Contract tests:** every model adapter satisfies the adapter interface.
4. **Visual regression tests:** component and page snapshots across breakpoints.
5. **Accessibility tests:** automated checks (axe-style) in CI plus manual audits.
6. **End-to-end tests:** install on sample sites, verify fallback, undo, locked zones.
7. **Performance tests:** Lighthouse budgets in CI.
8. **Load tests:** edge lookup and generation queue under burst traffic.

### 18.2 AI-specific evaluation
- **Eval harness:** fixed set of scenarios (segments, brand rules) run against every model and prompt version.
- Metrics: valid-blueprint rate, repair rate, policy-violation rate, diff size, human-rated quality, latency, cost.
- **Regression gate:** prompt or model changes cannot ship if eval scores drop.

### 18.3 Adversarial testing
- Prompt injection in page text, UTM parameters, and user input.
- Attempts to modify locked zones.
- Oversized or deeply nested outputs.
- Malicious URLs and actions.
- Deceptive-claim generation (fake discounts, false urgency).

---

## 19. Business Model, Pricing, and Licensing

### 19.1 Model: open core plus usage
- **Open source (core):** schema, renderer, validator, basic adapters. Drives adoption and trust.
- **Paid (hosted/commercial):** control plane, edge variant service, analytics and experimentation, team features, enterprise controls, managed model routing.

### 19.2 Licensing options to decide in Phase 0
| Option | Pros | Cons |
|---|---|---|
| Permissive (MIT/Apache) | Max adoption | Easy for competitors to host a clone |
| Source-available / BSL-style | Protects hosted business | Some developers avoid it |
| AGPL + commercial license | Strong protection, dual-license revenue | Adoption friction in companies |

Take legal advice before finalizing; this is a business-critical decision.

### 19.3 Draft pricing tiers (to validate with pilots)
| Tier | Audience | Includes |
|---|---|---|
| Free | Developers, hobby | 1 site, limited segments/generations, community support |
| Pro | Small teams | Multiple sites, approvals, analytics, higher quotas |
| Business | Growing companies | Experimentation, team roles, audit log, priority support |
| Enterprise | Large orgs | SSO, SOC 2 docs, private deployment, custom models, SLA |

Usage dimensions: number of sites, generated variants per month, monthly tracked visitors, bring-your-own-model discount.

### 19.4 Additional revenue
- Marketplace for component packs and templates (revenue share).
- Agency/white-label plan.
- Professional services for onboarding.

### 19.5 Unit economics to track
Cost per generated variant, cost per 1,000 visitors served, gross margin per tier, payback on acquisition cost.

---

## 20. Go-to-Market

### 20.1 Sharp initial message
"Landing pages that adapt to every visitor, safely." Keep the engine general; keep the message specific.

### 20.2 Target segments (priority order)
1. Performance marketers and growth teams with paid traffic (clear ROI).
2. SaaS companies optimizing onboarding and pricing pages.
3. Agencies managing many client sites.
4. Developers building products who want embedded adaptive UI.

### 20.3 Channels
- Open-source repository, strong README, live playground.
- Developer content: benchmarks, tutorials, "how it works" posts.
- Launch on Hacker News, Product Hunt, developer communities.
- Integrations and marketplace listings (WordPress, Shopify).
- Case studies with measured lift.
- Partnerships with analytics, CMS, and consent platforms.

### 20.4 Proof assets
- Public demo site that visibly adapts.
- Benchmark showing model-agnostic reliability.
- Customer lift reports (with permission).
- Security whitepaper.

---

## 21. Team and Resourcing

### 21.1 Minimum viable team (through Phase 4)
- 1 technical lead/architect (you or a co-founder)
- 2 full-stack TypeScript engineers
- 1 frontend/design-systems engineer (components, accessibility)
- 1 part-time designer (component library, dashboard)
- Part-time: security advisor, legal counsel

### 21.2 Add by Phase 6
- Developer relations/content
- Customer success/solutions engineer
- Growth/marketing

### 21.3 Solo-founder path
Possible but slower. Prioritize: schema, renderer, validator, one model adapter, a landing pack, and a thin dashboard. Use managed services (auth, hosting, analytics) to save time. Delay enterprise features.

---

## 22. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Large competitors add the feature | High | Focus on safety, framework independence, measured lift, and ecosystem |
| Adaptation shows no measurable lift | High | Build experimentation early; start with high-leverage use cases |
| Users confused by changing UI | Medium | Restraint rules; gradual changes; transparency controls |
| Deceptive/dark-pattern output | High | Policy engine, banned patterns, human approval modes |
| SEO damage | High | SSR/edge rendering; canonical version for crawlers; testing |
| Model cost spikes | Medium | Segment-level generation, diffs, caps, small-model routing |
| Model quality varies | Medium | Repair loop, fallback chain, eval gates |
| Security incident (prompt injection, key leak) | High | Threat model, red-team, strict validation, signed blueprints |
| Open-source cloning | Medium | Licensing choice; hosted value (analytics, edge, controls) |
| Privacy/regulatory issues | High | Data minimization, consent integration, regional processing |
| Scope creep ("everything UI") | High | Ship Landing Pack first; strict phase gates |
| Component mapping too hard for customers | Medium | Great CLI/tooling; start with hosted packs; overlay mode on-ramp |

---

## 23. Key Metrics (KPIs)

### 23.1 Product quality
- Valid-blueprint rate (first try and after repair)
- Policy violation rate (target: 0 reaching production)
- Fallback rate
- Added LCP/CLS vs default

### 23.2 Customer value
- Conversion lift vs holdout
- Time to first adapted page after install
- Approval rate of suggested variants

### 23.3 Business
- Sites installed, weekly active sites
- Free to paid conversion
- Monthly recurring revenue, net revenue retention
- Gross margin (after model costs)
- Support tickets per customer

---

## 24. Open Questions and Decisions to Make

1. **Name, brand, and domain.**
2. **Licensing model** (permissive, source-available, AGPL + commercial).
3. **First beachhead customer** (growth teams, SaaS onboarding, agencies).
4. **Component mapping vs hosted components first** for early customers.
5. **Hosting model:** fully managed only, or also self-hosted for enterprise?
6. **Data policy:** what visitor data may be used for model context and learning?
7. **Default approval mode:** safest is approve-first; most appealing is auto-apply with guardrails.
8. **Pricing metric:** per site, per visitor, per generation, or hybrid.
9. **Funding path:** bootstrap, pre-seed, or customer-funded pilots.
10. **Backend module:** when (if ever) and under what safety model.

---

## 25. Immediate Next Steps (First 30 Days)

1. Finalize the **blueprint schema v1** (tokens, layout, components, content, flow) and publish as a draft spec.
2. Build the **Phase 0 demo**: one landing page, 6 components, one model, valid-or-fallback rendering.
3. Write the **component catalog list** for the Landing Page Pack (names, props, permissions).
4. Draft the **policy language** (locked zones, banned phrases, allowed actions).
5. Run **15-20 customer interviews** and record willingness to pay.
6. Decide **licensing and naming** with legal input.
7. Set up the **monorepo, CI, and eval harness skeleton**.

---

## Appendix A: Example Component Catalog (Landing Page Pack v1)

| Component | Key props | AI-editable | Locked by default |
|---|---|---|---|
| Nav | links, logo, cta | order of links (limited) | yes (structure) |
| Hero | headline, subheadline, cta, media | all text, variant | no |
| LogoCloud | logos, caption | caption, order | no |
| FeatureGrid | items[icon,title,text] | text, order, count | no |
| Testimonials | quotes[name,role,text] | selection and order only | no (text verified) |
| PricingTable | plans, prices, features | none | **yes** |
| FAQ | items[q,a] | order, selection | no |
| CTA | headline, button | text | no |
| LeadForm | fields, consent | none | **yes** |
| LegalFooter | links, text | none | **yes** |
| Banner | text, action | text | no |

## Appendix B: Example Eval Scenario

```yaml
scenario: mobile-visitor-from-speed-ad
segment: { ref: google-ads, device: mobile, lang: en, returning: false }
brand: { tone: friendly, banned: ["guaranteed", "cheapest"] }
locked: [pricing, legal-footer, lead-form]
expect:
  - blueprint validates against schema
  - hero headline references speed or time-to-launch
  - no locked component modified
  - no banned phrase present
  - section changes <= 3
  - contrast ratio >= 4.5 on all text
```

## Appendix C: Glossary
- **Blueprint:** structured JSON description of a page the engine can render.
- **Segment:** group of visitors with shared attributes mapped to one blueprint.
- **Locked zone:** content the AI may never alter.
- **Adapter:** wrapper that lets the engine talk to a specific AI model.
- **Control plane:** the hosted dashboard and API where owners manage policies and approvals.
- **Holdout:** a group of visitors who always see the default page, used to measure lift.