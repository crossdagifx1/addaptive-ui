export interface DocSection {
  id: string;
  title: string;
  category: "Getting Started" | "Core Concepts" | "Guides" | "Security" | "API Reference";
  contentHtml: string;
  summary: string;
}

export const DOC_SECTIONS: DocSection[] = [
  {
    id: "quickstart",
    title: "15-Minute Quickstart",
    category: "Getting Started",
    summary: "Install AUI Engine on any website in under 15 minutes with our drop-in embed or React SDK.",
    contentHtml: `
      <h2>15-Minute Quickstart Guide</h2>
      <p>AUI Engine is a model-agnostic, drop-in layer that lets any website safely reshape its user interface per visitor segment. It does <strong>not</strong> execute arbitrary code; instead, AI models generate validated JSON blueprints that approved components render.</p>

      <h3>Option A: Drop-In Vanilla Script Embed (Zero Build Step)</h3>
      <p>Works instantly on WordPress, Shopify, Webflow, Squarespace, or static HTML pages. Paste this right before <code>&lt;/head&gt;</code>:</p>

      <pre><code>&lt;!-- AUI Engine Drop-In Script --&gt;
&lt;script
  src="https://cdn.aui-engine.com/embed.js"
  data-aui-site-id="your_site_id"
  data-aui-key="aui_live_your_key"
  async&gt;
&lt;/script&gt;</code></pre>

      <h3>Option B: React / Next.js SDK</h3>
      <p>Install the UI adapters package:</p>
      <pre><code>pnpm add @aui/adapters-ui @aui/schema</code></pre>

      <p>Wrap your root application layout:</p>
      <pre><code>import { AUIProvider, AUIZone } from '@aui/adapters-ui';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    &lt;AUIProvider siteId="site_acme" apiKey="aui_live_key"&gt;
      &lt;nav&gt;...&lt;/nav&gt;
      &lt;AUIZone name="hero"&gt;
        &lt;Hero headline="Standard Default Headline" /&gt;
      &lt;/AUIZone&gt;
      {children}
    &lt;/AUIProvider&gt;
  );
}</code></pre>
    `,
  },
  {
    id: "blueprint-schema",
    title: "Blueprint Schema v1.0",
    category: "Core Concepts",
    summary: "Complete specification of the JSON Blueprint contract across all 5 layers.",
    contentHtml: `
      <h2>Blueprint Schema v1.0 Specification</h2>
      <p>A Blueprint is the central contract of AUI Engine. It is a strictly validated JSON document that describes a page across 5 distinct architectural layers:</p>

      <div class="callout callout-info">
        <strong>UI is Data, Not Code:</strong> The AI never ships executable JavaScript to the client. All modifications are constrained to declarative properties within approved components.
      </div>

      <h3>The 5 Architectural Layers</h3>
      <ol>
        <li><strong>Layer 1 — Tokens:</strong> CSS variables for colors, typography, density, and radiuses.</li>
        <li><strong>Layer 2 — Layout:</strong> Structure of sections (stack, grid, split, sidebar).</li>
        <li><strong>Layer 3 — Components:</strong> Component instances keyed by section name.</li>
        <li><strong>Layer 4 — Content:</strong> Copy, headlines, badges, and media URLs.</li>
        <li><strong>Layer 5 — Flow:</strong> Client actions (e.g. <code>navigate:/signup</code>, <code>scroll:#features</code>).</li>
      </ol>

      <h3>Sample Blueprint JSON</h3>
      <pre><code>{
  "schemaVersion": "1.0",
  "blueprintId": "bp_landing_enterprise",
  "pageId": "landing-home",
  "segment": "enterprise-b2b",
  "tokens": {
    "color.primary": "#00e5ff",
    "color.background": "#0a0a0f",
    "density": "comfortable"
  },
  "layout": {
    "type": "stack",
    "sections": ["nav", "hero", "pricing", "footer"]
  },
  "components": {
    "hero": {
      "type": "Hero",
      "props": {
        "headline": "Enterprise Adaptive UI Infrastructure",
        "subheadline": "SOC2 Type II certified with 100% locked-zone protection."
      }
    },
    "pricing": {
      "type": "PricingTable",
      "locked": true,
      "props": { ... }
    }
  },
  "meta": {
    "generatedBy": "anthropic:claude-3-5-sonnet",
    "createdAt": "2026-10-22T08:00:00.000Z"
  }
}</code></pre>
    `,
  },
  {
    id: "security-whitepaper",
    title: "Security & Locked Zones Whitepaper",
    category: "Security",
    summary: "How AUI Engine guarantees 100% protection of locked content and eliminates prompt injection risks.",
    contentHtml: `
      <h2>Security & Locked Zones Whitepaper</h2>
      <p>Most generative UI systems allow the AI to invent HTML or render arbitrary React code. In enterprise and e-commerce contexts, this creates unacceptable financial and legal risks: hallucinated discounts, erased disclaimers, or XSS attacks.</p>

      <h3>The Zero-Tamper Invariant</h3>
      <p>AUI Engine enforces strict <strong>Locked Zones</strong>. Critical sections like pricing tiers, legal disclaimers, compliance badges, and checkout forms are designated as locked. The engine guarantees:</p>
      <ul>
        <li><strong>100% Immutable:</strong> Locked components cannot have their props, items, or placement modified by any AI model.</li>
        <li><strong>Deletion Immune:</strong> Models cannot remove or hide locked sections.</li>
        <li><strong>Validation Gate:</strong> Stage 4 of the 9-stage validation engine rejects candidate blueprints immediately if any locked section differs by even a single byte from the holdout baseline.</li>
      </ul>

      <h3>The 9-Stage Validation Pipeline</h3>
      <table class="docs-table">
        <thead>
          <tr><th>Stage</th><th>Name</th><th>Verification Performed</th></tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>Schema</td><td>Validates structure against BlueprintSchema (Zod)</td></tr>
          <tr><td>2</td><td>Component Check</td><td>Verifies all components are in the registered catalog</td></tr>
          <tr><td>3</td><td>Permissions</td><td>Ensures model only edited allowed props</td></tr>
          <tr><td>4</td><td>Locked Zones</td><td>Verifies 0% tampering with locked sections</td></tr>
          <tr><td>5</td><td>Content Policy</td><td>Blocks banned phrases, deceptive claims, and false urgency</td></tr>
          <tr><td>6</td><td>Link & Actions</td><td>Blocks dangerous URIs (e.g. javascript:) and unapproved domains</td></tr>
          <tr><td>7</td><td>Accessibility</td><td>Enforces minimum contrast (4.5:1), alt text, and heading order</td></tr>
          <tr><td>8</td><td>Size Budget</td><td>Limits section count, DOM size, and asset payload</td></tr>
          <tr><td>9</td><td>Diff Limits</td><td>Enforces maximum section modifications to prevent user disorientation</td></tr>
        </tbody>
      </table>

      <h3>SEO & Crawler Safety (Anti-Cloaking)</h3>
      <p>Search crawlers (Googlebot, Bingbot, Baiduspider) are automatically detected via <code>@aui/edge</code> and served the canonical default holdout blueprint. This eliminates any risk of cloaking penalties under Google Search Essentials.</p>
    `,
  },
  {
    id: "model-benchmarks",
    title: "Model Evaluation & Quality Benchmarks",
    category: "Core Concepts",
    summary: "Evaluation harness results across OpenAI, Anthropic, Google, and local models.",
    contentHtml: `
      <h2>Model Evaluation & Quality Benchmarks</h2>
      <p>AUI Engine is model-agnostic. We continuously benchmark leading frontier models, mid-tier models, and local models against standard and adversarial scenarios using <code>tools/eval-harness</code>.</p>

      <h3>Benchmark Matrix</h3>
      <table class="docs-table">
        <thead>
          <tr>
            <th>Model</th>
            <th>1st Turn Pass</th>
            <th>Repair Rate</th>
            <th>Locked Zone Compliance</th>
            <th>p50 Latency</th>
            <th>Safety Gate</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>GPT-4o (OpenAI)</strong></td>
            <td>100%</td>
            <td>0%</td>
            <td><strong>100%</strong></td>
            <td>650ms</td>
            <td><span class="pill pill-emerald">PASS</span></td>
          </tr>
          <tr>
            <td><strong>Claude 3.5 Sonnet (Anthropic)</strong></td>
            <td>100%</td>
            <td>0%</td>
            <td><strong>100%</strong></td>
            <td>720ms</td>
            <td><span class="pill pill-emerald">PASS</span></td>
          </tr>
          <tr>
            <td><strong>Gemini 1.5 Pro (Google)</strong></td>
            <td>96%</td>
            <td>100% (Turn 2)</td>
            <td><strong>100%</strong></td>
            <td>680ms</td>
            <td><span class="pill pill-emerald">PASS</span></td>
          </tr>
          <tr>
            <td><strong>Local 7B / Ollama</strong></td>
            <td>0%</td>
            <td>100% (Turn 2)</td>
            <td><strong>100%</strong></td>
            <td>1450ms</td>
            <td><span class="pill pill-emerald">PASS</span></td>
          </tr>
          <tr>
            <td><strong>Adversarial Attacker</strong></td>
            <td>0% (Blocked)</td>
            <td>0% (Rejected)</td>
            <td><strong>100% (Protected)</strong></td>
            <td>320ms</td>
            <td><span class="pill pill-emerald">PASS</span></td>
          </tr>
        </tbody>
      </table>

      <div class="callout callout-success">
        <strong>100% Locked-Zone Protection Across All Models:</strong> Even when an adversarial attacker model deliberately attempts to override pricing or inject malicious scripts, the validation pipeline intercepts the output and preserves the holdout default.
      </div>
    `,
  },
  {
    id: "component-authoring",
    title: "Component Authoring Guide",
    category: "Guides",
    summary: "How to create, register, and lock custom components in the catalog.",
    contentHtml: `
      <h2>Component Authoring Guide</h2>
      <p>To let the AI adapt custom sections while protecting brand standards, register your components with explicit prop schemas and permission boundaries.</p>

      <h3>Registering a Custom Component</h3>
      <pre><code>import { registerComponent } from '@aui/core';

registerComponent({
  type: 'CustomerQuote',
  displayName: 'Customer Testimonial Quote',
  description: 'Displays a customer quote with company logo',
  propsSchema: {
    type: 'object',
    properties: {
      quote: { type: 'string' },
      author: { type: 'string' },
      role: { type: 'string' },
      company: { type: 'string' }
    },
    required: ['quote', 'author']
  },
  permissions: {
    editable: ['quote', 'role'], // Model may only edit quote and role
    readonly: ['company', 'author'], // Model CANNOT alter the author
    reorderable: true,
    removable: false
  },
  lockedByDefault: false,
  renderer: (props) => {
    const el = document.createElement('blockquote');
    el.className = 'customer-quote';
    el.innerHTML = '&ldquo;' + props.quote + '&rdquo; — &lt;cite&gt;' + props.author + '&lt;/cite&gt;';
    return el;
  }
});</code></pre>
    `,
  },
  {
    id: "cli-reference",
    title: "CLI Command Reference",
    category: "API Reference",
    summary: "Developer commands for init, validation, preview, and component inspection.",
    contentHtml: `
      <h2>CLI Command Reference</h2>
      <p>The <code>@aui/cli</code> provides local development tooling for authoring and validating blueprints.</p>

      <h3>Commands</h3>
      <ul>
        <li><code>aui init</code> — Scaffolds an <code>aui.config.json</code> in the current project.</li>
        <li><code>aui validate &lt;path&gt;</code> — Validates a blueprint against the 9 security stages.</li>
        <li><code>aui preview &lt;path&gt;</code> — Launches a local sandbox preview of the blueprint.</li>
        <li><code>aui register &lt;path&gt;</code> — Inspects and registers custom components.</li>
      </ul>

      <pre><code># Validate a blueprint
pnpm aui validate tools/fixtures/standard-blueprint.json

# Preview a blueprint locally
pnpm aui preview tools/fixtures/standard-blueprint.json --port 5000</code></pre>
    `,
  },
];
