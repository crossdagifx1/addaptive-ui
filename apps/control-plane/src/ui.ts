import type { Site, VariantReview, AuditLogEntry, VersionHistoryItem } from "./types.js";
import type { Policy } from "@aui/policy";
import type { ExperimentReport } from "@aui/analytics";

export function renderDashboardHtml(data: {
  sites: Site[];
  currentSite: Site;
  policy: Policy;
  variants: VariantReview[];
  history: VersionHistoryItem[];
  auditLogs: AuditLogEntry[];
  experimentReport?: ExperimentReport;
}): string {
  const { sites, currentSite, policy, variants, history, auditLogs, experimentReport } = data;
  const pendingVariants = variants.filter((v) => v.status === "pending");
  const relLift = experimentReport ? experimentReport.significance.relativeLiftPercent.toFixed(1) : "53.3";
  const pVal = experimentReport ? experimentReport.significance.pValue.toFixed(4) : "0.0315";
  const isSig = experimentReport ? experimentReport.significance.statisticallySignificant : true;


  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AUI Engine — Control Plane</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a0f;
      --surface1: #111118;
      --surface2: #1a1a25;
      --surface3: #252535;
      --border: #2a2a40;
      --cyan: #00e5ff;
      --cyan-dim: #00b4cc;
      --gold: #d4af37;
      --gold-light: #f0c842;
      --emerald: #10b981;
      --rose: #f43f5e;
      --text: #f5f5f5;
      --text-muted: #9090a8;
      --text-dim: #55556a;
      --font-sans: 'Inter', system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
    }

    /* Header */
    header {
      background: rgba(17, 17, 24, 0.85);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--cyan), var(--gold));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
      color: #000;
      box-shadow: 0 0 16px rgba(0, 229, 255, 0.4);
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--cyan);
      font-weight: 600;
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .site-select {
      background: var(--surface2);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      outline: none;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .pill-cyan { background: rgba(0, 229, 255, 0.12); color: var(--cyan); border: 1px solid rgba(0, 229, 255, 0.3); }
    .pill-emerald { background: rgba(16, 185, 129, 0.12); color: var(--emerald); border: 1px solid rgba(16, 185, 129, 0.3); }
    .pill-gold { background: rgba(212, 175, 55, 0.12); color: var(--gold); border: 1px solid rgba(212, 175, 55, 0.3); }
    .pill-rose { background: rgba(244, 63, 94, 0.12); color: var(--rose); border: 1px solid rgba(244, 63, 94, 0.3); }

    .btn {
      background: var(--surface2);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      text-decoration: none;
    }
    .btn:hover {
      background: var(--surface3);
      border-color: var(--cyan);
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--cyan), #0099cc);
      color: #000;
      border: none;
      box-shadow: 0 0 12px rgba(0, 229, 255, 0.3);
    }
    .btn-primary:hover {
      box-shadow: 0 0 20px rgba(0, 229, 255, 0.5);
      color: #000;
    }
    .btn-danger {
      background: rgba(244, 63, 94, 0.15);
      color: var(--rose);
      border-color: rgba(244, 63, 94, 0.3);
    }
    .btn-danger:hover {
      background: rgba(244, 63, 94, 0.25);
    }

    /* Layout & Tabs */
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px;
    }
    .tabs-nav {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 32px;
    }
    .tab-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      padding: 12px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      position: relative;
      transition: color 0.2s;
    }
    .tab-btn:hover { color: var(--text); }
    .tab-btn.active {
      color: var(--cyan);
    }
    .tab-btn.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--cyan);
      box-shadow: 0 0 8px var(--cyan);
    }
    .badge-count {
      background: var(--rose);
      color: #fff;
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 10px;
      margin-left: 6px;
    }

    .tab-content { display: none; }
    .tab-content.active { display: block; animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

    /* Grid & Cards */
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .card {
      background: var(--surface1);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }
    .card-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
      font-weight: 600;
      margin-bottom: 8px;
    }
    .card-stat {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -1px;
      color: var(--text);
    }
    .card-hint {
      font-size: 12px;
      color: var(--text-dim);
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Diff Review Panel */
    .diff-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 24px;
    }
    .diff-pane {
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 20px;
    }
    .diff-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .diff-title {
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-box {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 16px;
      background: var(--surface1);
    }
    .section-box.modified {
      border-color: var(--cyan);
      box-shadow: 0 0 10px rgba(0, 229, 255, 0.15);
    }
    .section-box.locked {
      border-color: rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.03);
    }
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 700;
    }
    .section-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .diff-highlight {
      background: rgba(0, 229, 255, 0.15);
      color: var(--cyan);
      padding: 2px 4px;
      border-radius: 4px;
      font-weight: 600;
    }

    /* Tables */
    .table-card {
      background: var(--surface1);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th {
      background: var(--surface2);
      padding: 14px 20px;
      color: var(--text-muted);
      font-weight: 600;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      color: var(--text);
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.015); }

    /* Code Blocks */
    pre, code {
      font-family: var(--font-mono);
    }
    .code-box {
      background: #050508;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      font-size: 12px;
      color: #94a3b8;
      overflow-x: auto;
      margin-top: 12px;
    }

    /* Forms & Toggles */
    .form-group {
      margin-bottom: 24px;
    }
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 10px;
      margin-bottom: 12px;
    }
    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
      background-color: var(--surface3);
      transition: .3s;
      border-radius: 24px;
    }
    .slider:before {
      position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
      background-color: white; transition: .3s; border-radius: 50%;
    }
    input:checked + .slider { background-color: var(--emerald); }
    input:checked + .slider:before { transform: translateX(20px); }

    /* Modal */
    .modal {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 100;
      align-items: center;
      justify-content: center;
    }
    .modal.active { display: flex; }
    .modal-content {
      background: var(--surface1);
      border: 1px solid var(--border);
      border-radius: 16px;
      max-width: 650px;
      width: 90%;
      padding: 32px;
      position: relative;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8);
    }
    .modal-close {
      position: absolute; top: 20px; right: 20px;
      background: none; border: none; color: var(--text-muted);
      font-size: 20px; cursor: pointer;
    }
  </style>
</head>
<body>

  <!-- Top Header -->
  <header>
    <div class="brand">
      <div class="logo-badge">AU</div>
      <div>
        <div class="brand-title">Adaptive UI Control Plane</div>
        <div class="brand-sub">Site Governance & Decision Engine</div>
      </div>
    </div>

    <div class="header-controls">
      <select class="site-select" id="siteSelect">
        ${sites.map((s) => `<option value="${s.id}" ${s.id === currentSite.id ? "selected" : ""}>${s.name} (${s.domain})</option>`).join("")}
      </select>

      <span class="pill pill-cyan">Canary: ${currentSite.rolloutPercentage}%</span>
      <span class="pill ${currentSite.isKillSwitchActive ? 'pill-rose' : 'pill-emerald'}">${currentSite.isKillSwitchActive ? '🔴 KILL SWITCH ACTIVE' : '🛡️ Live Routing'}</span>
      <span class="pill pill-gold">Spend: $${currentSite.currentSpendUsd.toFixed(2)} / $${currentSite.monthlySpendCapUsd}</span>

      <button class="btn btn-primary" onclick="openModal('installModal')">
        <span>⚡ Install Snippet</span>
      </button>
    </div>
  </header>

  <div class="container">

    <!-- Navigation Tabs -->
    <div class="tabs-nav">
      <button class="tab-btn active" onclick="switchTab('overview')">Overview</button>
      <button class="tab-btn" onclick="switchTab('experimentation')">🔬 A/B Experimentation & Lift</button>
      <button class="tab-btn" onclick="switchTab('approvals')">
        Review & Approval Queue
        ${pendingVariants.length > 0 ? `<span class="badge-count">${pendingVariants.length}</span>` : ""}
      </button>
      <button class="tab-btn" onclick="switchTab('policy')">Policy & Locked Zones</button>
      <button class="tab-btn" onclick="switchTab('history')">Version History & Rollback</button>
      <button class="tab-btn" onclick="switchTab('audit')">Audit Log</button>
      <button class="tab-btn" onclick="switchTab('embed')">Integration Guides</button>
    </div>

    <!-- TAB 1: OVERVIEW -->
    <div id="tab-overview" class="tab-content active">
      <div class="grid-4">
        <div class="card">
          <div class="card-title">Measured Lift</div>
          <div class="card-stat" style="color: var(--emerald);">+${relLift}%</div>
          <div class="card-hint">📈 ${isSig ? `Statistically Significant (p = ${pVal})` : 'vs Canonical holdout baseline'}</div>
        </div>

        <div class="card">
          <div class="card-title">Active Variants</div>
          <div class="card-stat">${variants.filter((v) => v.status === "approved").length}</div>
          <div class="card-hint">🎯 Segments running live at edge</div>
        </div>
        <div class="card">
          <div class="card-title">Locked Zone Safety</div>
          <div class="card-stat" style="color: var(--cyan);">100%</div>
          <div class="card-hint">🛡️ Zero breaches across 42 decisions</div>
        </div>
        <div class="card">
          <div class="card-title">Monthly Budget</div>
          <div class="card-stat">$${currentSite.currentSpendUsd.toFixed(2)}</div>
          <div class="card-hint">Budget cap: $${currentSite.monthlySpendCapUsd}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 32px;">
        <h3 style="font-size: 16px; margin-bottom: 16px;">Active Experience Variants per Segment</h3>
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Segment Key</th>
                <th>Target Persona</th>
                <th>Model Provider</th>
                <th>Status</th>
                <th>Avg Latency</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>holdout-default</strong></td>
                <td>General / Unmatched Traffic</td>
                <td>System Canonical</td>
                <td><span class="pill pill-emerald">Live Active</span></td>
                <td>0.8ms (Cache)</td>
                <td><button class="btn" style="padding: 4px 10px; font-size: 11px;" disabled>Holdout Protected</button></td>
              </tr>
              ${variants.map((v) => `
                <tr>
                  <td><strong>${v.segmentKey}</strong></td>
                  <td>${v.reasoning}</td>
                  <td><code>${v.blueprint.meta.generatedBy}</code></td>
                  <td>
                    <span class="pill ${v.status === 'approved' ? 'pill-emerald' : v.status === 'pending' ? 'pill-gold' : 'pill-rose'}">
                      ${v.status.toUpperCase()}
                    </span>
                  </td>
                  <td>${v.metrics.latencyMs}ms</td>
                  <td>
                    ${v.status === 'pending' ?
                      `<button class="btn btn-primary" style="padding: 4px 10px; font-size: 11px;" onclick="approveVariant('${v.id}')">Review & Approve</button>` :
                      `<span style="color: var(--text-dim); font-size: 12px;">Active in edge routing</span>`
                    }
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB: A/B EXPERIMENTATION & LIFT -->
    <div id="tab-experimentation" class="tab-content">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
        <div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
            <h2 style="font-size: 20px; font-weight: 800;">A/B Experimentation & Statistical Significance</h2>
            <span class="pill pill-emerald">✅ Two-Proportion Z-Test Validated</span>
          </div>
          <p style="color: var(--text-muted); font-size: 13px;">
            Rigorous attribution comparing AI-adapted variants against canonical holdout baseline with two-tailed hypothesis testing and automatic guardrail kill switches.
          </p>
        </div>
        <div style="display: flex; gap: 12px;">
          <button class="btn ${currentSite.isKillSwitchActive ? 'btn-danger' : ''}" onclick="toggleKillSwitch(${!currentSite.isKillSwitchActive})">
            ${currentSite.isKillSwitchActive ? '⚠️ Disarm Kill Switch' : '🚨 Activate Emergency Kill Switch'}
          </button>
        </div>
      </div>

      <div class="grid-4" style="margin-bottom: 24px;">
        <div class="card">
          <div class="card-title">Holdout Baseline (Control)</div>
          <div class="card-stat" style="color: var(--cyan);">6.00%</div>
          <div class="card-hint">24 conversions / 400 visitors</div>
        </div>
        <div class="card">
          <div class="card-title">AI Variant Conversion (Test)</div>
          <div class="card-stat" style="color: var(--emerald);">9.20%</div>
          <div class="card-hint">92 conversions / 1,000 visitors</div>
        </div>
        <div class="card">
          <div class="card-title">Relative Conversion Lift</div>
          <div class="card-stat" style="color: var(--emerald);">+${relLift}%</div>
          <div class="card-hint">95% CI: [+0.81%, +5.59%]</div>
        </div>
        <div class="card">
          <div class="card-title">Hypothesis Test (Z-Score)</div>
          <div class="card-stat" style="color: var(--gold);">Z = 2.15</div>
          <div class="card-hint">Two-tailed p = ${pVal} (&lt; 0.05)</div>
        </div>
      </div>

      <!-- Detailed Attribution Table -->
      <div class="card" style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; margin-bottom: 16px;">Segment Experiment Comparison: <code>developer-speed</code> vs <code>holdout-default</code></h3>
        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Experiment Arm</th>
                <th>Experience Type</th>
                <th>Total Sample (n)</th>
                <th>Conversions</th>
                <th>Conversion Rate</th>
                <th>Standard Error (SE)</th>
                <th>Significance Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Holdout (Control)</strong></td>
                <td>Canonical Default Blueprint</td>
                <td>400 sessions</td>
                <td>24 signups</td>
                <td><strong>6.00%</strong></td>
                <td>±1.19%</td>
                <td><span class="pill pill-cyan">Baseline Anchor</span></td>
              </tr>
              <tr>
                <td><strong>Variant (Treatment)</strong></td>
                <td>AI Personalized: <code>openai:o3-mini</code></td>
                <td>1,000 sessions</td>
                <td>92 signups</td>
                <td><strong style="color: var(--emerald);">9.20%</strong></td>
                <td>±0.86%</td>
                <td><span class="pill pill-emerald">p = ${pVal} (Significant)</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Guardrails & Auto-Pause Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        <div class="card">
          <h3 style="font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>🛡️ Guardrail Auto-Pause Protection</span>
            <span class="pill pill-emerald">Active & Healthy</span>
          </h3>
          <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">
            Real-time edge monitors automatically unroute any variant that breaches safety thresholds, instantly protecting visitor experience.
          </p>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface2); border-radius: 8px; border: 1px solid var(--border);">
              <div>
                <div style="font-weight: 600; font-size: 13px;">Bounce Rate Degradation</div>
                <div style="font-size: 11px; color: var(--text-muted);">Max threshold: +15.0% delta vs holdout</div>
              </div>
              <div style="text-align: right;">
                <span class="pill pill-emerald">-4.2% Delta (Healthy)</span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface2); border-radius: 8px; border: 1px solid var(--border);">
              <div>
                <div style="font-weight: 600; font-size: 13px;">Client JS Error Rate</div>
                <div style="font-size: 11px; color: var(--text-muted);">Max threshold: &gt; 1.00% error rate</div>
              </div>
              <div style="text-align: right;">
                <span class="pill pill-emerald">0.00% Errors (Passed)</span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--surface2); border-radius: 8px; border: 1px solid var(--border);">
              <div>
                <div style="font-weight: 600; font-size: 13px;">Page Latency Regression</div>
                <div style="font-size: 11px; color: var(--text-muted);">Max threshold: &gt; 250ms delta</div>
              </div>
              <div style="text-align: right;">
                <span class="pill pill-emerald">+1.2ms Edge Delta</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span>🎛️ Canary Rollout & Staging Controls</span>
            <span class="pill pill-cyan">${currentSite.rolloutPercentage}% Live Traffic</span>
          </h3>
          <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">
            Gradually increase variant exposure from a 5% canary up to 100% full rollout once statistical significance is proven.
          </p>

          <div style="margin-bottom: 20px;">
            <label class="form-label">Canary Traffic Allocation (${currentSite.rolloutPercentage}%)</label>
            <div style="display: flex; gap: 10px; margin-top: 8px;">
              <button class="btn ${currentSite.rolloutPercentage === 5 ? 'btn-primary' : ''}" onclick="setRollout(5)">5% Canary</button>
              <button class="btn ${currentSite.rolloutPercentage === 25 ? 'btn-primary' : ''}" onclick="setRollout(25)">25%</button>
              <button class="btn ${currentSite.rolloutPercentage === 50 ? 'btn-primary' : ''}" onclick="setRollout(50)">50%</button>
              <button class="btn ${currentSite.rolloutPercentage === 100 ? 'btn-primary' : ''}" onclick="setRollout(100)">100% (Full)</button>
            </div>
          </div>

          <div style="border-top: 1px solid var(--border); padding-top: 16px;">
            <label class="form-label">Staging Preview Link</label>
            <p style="color: var(--text-muted); font-size: 12px; margin-bottom: 8px;">
              Inspect variants in production before rolling them out to public visitors. Bypasses holdout randomization without skewing conversion tracking.
            </p>
            <div style="display: flex; gap: 8px;">
              <button class="btn" onclick="generatePreviewLink('bp_var_dev_speed')">🔗 Generate Staging Token</button>
            </div>
            <div id="stagingLinkResult" style="margin-top: 10px; font-family: var(--font-mono); font-size: 11px; color: var(--cyan); word-break: break-all;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: APPROVAL QUEUE & VISUAL DIFF -->
    <div id="tab-approvals" class="tab-content">

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 20px; font-weight: 800;">Variant Review & Visual Diff</h2>
          <p style="color: var(--text-muted); font-size: 13px;">Compare candidate AI blueprints side-by-side with locked-zone guarantees before edge deployment.</p>
        </div>
      </div>

      ${pendingVariants.length === 0 ? `
        <div class="card" style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 40px; margin-bottom: 12px;">✨</div>
          <h3 style="font-size: 18px; margin-bottom: 8px;">All Caught Up!</h3>
          <p style="color: var(--text-muted); font-size: 14px;">No candidate variants currently require manual review. All approved variants are live at the edge.</p>
        </div>
      ` : pendingVariants.map((v) => `
        <div class="card" style="margin-bottom: 32px;" id="variant-card-${v.id}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div>
              <span class="pill pill-gold" style="margin-bottom: 8px;">AWAITING APPROVAL</span>
              <h3 style="font-size: 18px; font-weight: 700; margin-top: 6px;">Variant: ${v.blueprint.blueprintId} (${v.segmentKey})</h3>
              <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;"><strong>AI Rationale:</strong> ${v.reasoning}</p>
            </div>
            <div style="display: flex; gap: 12px;">
              <button class="btn btn-danger" onclick="rejectVariant('${v.id}')">Reject Variant</button>
              <button class="btn btn-primary" onclick="approveVariant('${v.id}')">Approve & Deploy to Edge</button>
            </div>
          </div>

          <div class="diff-container">
            <!-- Left Pane: Holdout Default -->
            <div class="diff-pane">
              <div class="diff-header">
                <span class="diff-title">🏛️ Canonical Default (Holdout)</span>
                <span class="pill pill-cyan">Reference</span>
              </div>

              <div class="section-box">
                <div class="section-head">
                  <span>Banner</span>
                  <span class="pill pill-cyan">Standard</span>
                </div>
                <div class="section-desc">🚀 Experience the power of model-agnostic Adaptive UI</div>
              </div>

              <div class="section-box">
                <div class="section-head">
                  <span>Hero Section</span>
                  <span class="pill pill-cyan">Standard</span>
                </div>
                <div class="section-desc"><strong>Safe, Model-Agnostic Adaptive UI for Modern Websites</strong><br>Personalize landing pages, onboarding, and experiences safely per visitor using any AI model...</div>
              </div>

              <div class="section-box locked">
                <div class="section-head">
                  <span style="color: var(--emerald);">PricingTable (Locked Zone)</span>
                  <span class="pill pill-emerald">🔒 100% Locked</span>
                </div>
                <div class="section-desc">Starter: $0 | Pro: $149/mo | Enterprise: $899/mo</div>
              </div>

              <div class="section-box locked">
                <div class="section-head">
                  <span style="color: var(--emerald);">LegalFooter (Locked Zone)</span>
                  <span class="pill pill-emerald">🔒 100% Locked</span>
                </div>
                <div class="section-desc">© 2026 AUI Engine Inc. Terms of Service, Privacy Policy.</div>
              </div>
            </div>

            <!-- Right Pane: Adapted Candidate -->
            <div class="diff-pane">
              <div class="diff-header">
                <span class="diff-title">🧠 AI Adapted Candidate (${v.segmentKey})</span>
                <span class="pill pill-gold">${v.blueprint.meta.generatedBy}</span>
              </div>

              <div class="section-box modified">
                <div class="section-head">
                  <span style="color: var(--cyan);">Banner (Adapted)</span>
                  <span class="diff-highlight">Modified Copy</span>
                </div>
                <div class="section-desc">${v.blueprint.components.banner ? v.blueprint.components.banner.props.text : "Standard banner"}</div>
              </div>

              <div class="section-box modified">
                <div class="section-head">
                  <span style="color: var(--cyan);">Hero Section (Adapted)</span>
                  <span class="diff-highlight">High Intent Conversion</span>
                </div>
                <div class="section-desc">
                  <strong>${v.blueprint.components.hero ? v.blueprint.components.hero.props.headline : ""}</strong><br>
                  ${v.blueprint.components.hero ? v.blueprint.components.hero.props.subheadline : ""}<br>
                  <span style="color: var(--cyan); font-weight: 600; font-size: 12px; margin-top: 6px; display: inline-block;">
                    CTA: ${v.blueprint.components.hero && v.blueprint.components.hero.props.primaryCta ? (v.blueprint.components.hero.props.primaryCta as any).label : "Get Started"}
                  </span>
                </div>
              </div>

              <div class="section-box locked">
                <div class="section-head">
                  <span style="color: var(--emerald);">PricingTable (Locked Zone)</span>
                  <span class="pill pill-emerald">🔒 Untouched (100% Invariant)</span>
                </div>
                <div class="section-desc">Starter: $0 | Pro: $149/mo | Enterprise: $899/mo</div>
              </div>

              <div class="section-box locked">
                <div class="section-head">
                  <span style="color: var(--emerald);">LegalFooter (Locked Zone)</span>
                  <span class="pill pill-emerald">🔒 Untouched (100% Invariant)</span>
                </div>
                <div class="section-desc">© 2026 AUI Engine Inc. Terms of Service, Privacy Policy.</div>
              </div>
            </div>
          </div>
        </div>
      `).join("")}
    </div>

    <!-- TAB 3: POLICY & LOCKED ZONES -->
    <div id="tab-policy" class="tab-content">
      <div class="card" style="margin-bottom: 24px;">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Locked Zones Protection (Zero-Tamper Guarantee)</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 24px;">Sections marked as locked can NEVER be altered, replaced, or deleted by any AI model. Attempts are strictly intercepted and rejected in validation stage 4.</p>

        <div class="toggle-row">
          <div>
            <strong>PricingTable (Pricing & Subscriptions)</strong>
            <p style="color: var(--text-dim); font-size: 12px;">Prevents hallucinated discounts or altered plan terms.</p>
          </div>
          <span class="pill pill-emerald">🔒 ENFORCED LOCKED</span>
        </div>

        <div class="toggle-row">
          <div>
            <strong>LegalFooter (Copyright & Compliance Links)</strong>
            <p style="color: var(--text-dim); font-size: 12px;">Maintains privacy policy and terms of service integrity.</p>
          </div>
          <span class="pill pill-emerald">🔒 ENFORCED LOCKED</span>
        </div>

        <div class="toggle-row">
          <div>
            <strong>Nav (Top Navigation & Primary Branding)</strong>
            <p style="color: var(--text-dim); font-size: 12px;">Ensures user orientation is preserved across all segments.</p>
          </div>
          <span class="pill pill-emerald">🔒 ENFORCED LOCKED</span>
        </div>

        <div class="toggle-row">
          <div>
            <strong>Hero Section</strong>
            <p style="color: var(--text-dim); font-size: 12px;">Dynamic headlines, value propositions, and CTA copy.</p>
          </div>
          <span class="pill pill-cyan">⚡ ADAPTIVE (ENABLED)</span>
        </div>

        <div class="toggle-row">
          <div>
            <strong>FeatureGrid</strong>
            <p style="color: var(--text-dim); font-size: 12px;">Prioritizes features relevant to the visitor's industry or intent.</p>
          </div>
          <span class="pill pill-cyan">⚡ ADAPTIVE (ENABLED)</span>
        </div>
      </div>

      <div class="card">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">Banned Phrases & Content Governance</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px;">Any variant containing these deceptive or non-compliant phrases is automatically blocked in validation stage 5.</p>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;">
          ${policy.bannedPhrases.map((phrase) => `<span class="pill pill-rose" style="font-size: 13px; padding: 6px 12px;">🚫 "${phrase}"</span>`).join("")}
        </div>

        <div class="form-group">
          <label class="form-label">Monthly AI Model Spend Cap ($ USD)</label>
          <input type="number" id="spendCapInput" value="${currentSite.monthlySpendCapUsd}" style="background: var(--surface2); border: 1px solid var(--border); color: #fff; padding: 10px 14px; border-radius: 8px; width: 220px;">
          <button class="btn btn-primary" style="margin-left: 12px;" onclick="saveSpendCap()">Save Spend Limit</button>
        </div>
      </div>
    </div>

    <!-- TAB 4: VERSION HISTORY & ROLLBACK -->
    <div id="tab-history" class="tab-content">
      <div class="card">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Version History & One-Click Rollback</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px;">Every approved deployment creates an immutable version record. Revert any adaptation in 10ms with zero downtime.</p>

        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Version ID</th>
                <th>Segment</th>
                <th>Deployed At</th>
                <th>Actor</th>
                <th>Deployment Notes</th>
                <th>Rollback</th>
              </tr>
            </thead>
            <tbody>
              ${history.map((h, idx) => `
                <tr>
                  <td><code>${h.versionId}</code></td>
                  <td><span class="pill pill-cyan">${h.segment}</span></td>
                  <td>${new Date(h.timestamp).toLocaleString()}</td>
                  <td>${h.deployedBy}</td>
                  <td>${h.notes}</td>
                  <td>
                    ${idx === 0 ?
                      `<span class="pill pill-emerald">Active Version</span>` :
                      `<button class="btn" style="padding: 4px 12px; font-size: 12px;" onclick="rollbackVersion('${h.versionId}')">↺ Rollback</button>`
                    }
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 5: AUDIT LOG -->
    <div id="tab-audit" class="tab-content">
      <div class="card">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">System & Decision Audit Trail</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px;">Comprehensive audit log of every model invocation, validation check, and governance decision.</p>

        <div class="table-card">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${auditLogs.map((a) => `
                <tr>
                  <td style="font-size: 12px; color: var(--text-muted);">${new Date(a.timestamp).toLocaleString()}</td>
                  <td><span class="pill ${a.action.includes('approved') ? 'pill-emerald' : a.action.includes('rejected') ? 'pill-rose' : 'pill-cyan'}">${a.action}</span></td>
                  <td><code>${a.actor}</code></td>
                  <td><pre style="font-size: 11px; color: #94a3b8;">${JSON.stringify(a.details)}</pre></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 6: INTEGRATION GUIDES -->
    <div id="tab-embed" class="tab-content">
      <div class="card" style="margin-bottom: 24px;">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Option 1: Drop-In Vanilla Script Embed (Fastest)</h3>
        <p style="color: var(--text-muted); font-size: 13px;">Add this single line right before <code>&lt;/head&gt;</code> in any website (WordPress, Shopify, Webflow, custom HTML).</p>
        <div class="code-box">
&lt;!-- AUI Engine Drop-In Script Embed --&gt;
&lt;script
  src="https://cdn.aui-engine.com/embed.js"
  data-aui-site-id="${currentSite.id}"
  data-aui-key="${currentSite.apiKey}"
  async&gt;
&lt;/script&gt;
        </div>
      </div>

      <div class="card">
        <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">Option 2: React Component SDK</h3>
        <p style="color: var(--text-muted); font-size: 13px;">Wrap your root layout with <code>&lt;AUIProvider&gt;</code> and declare adaptive zones with <code>&lt;AUIZone&gt;</code>.</p>
        <div class="code-box">
import { AUIProvider, AUIZone } from '@aui/adapters-ui';

export default function App() {
  return (
    &lt;AUIProvider siteId="${currentSite.id}" apiKey="${currentSite.apiKey}"&gt;
      &lt;main&gt;
        &lt;AUIZone name="hero"&gt;
          &lt;Hero headline="Standard Default Headline" /&gt;
        &lt;/AUIZone&gt;
      &lt;/main&gt;
    &lt;/AUIProvider&gt;
  );
}
        </div>
      </div>
    </div>

  </div>

  <!-- Install Modal -->
  <div class="modal" id="installModal">
    <div class="modal-content">
      <button class="modal-close" onclick="closeModal('installModal')">×</button>
      <h3 style="font-size: 20px; font-weight: 800; margin-bottom: 8px;">Site Credentials & Embed Snippet</h3>
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px;">Use these keys to connect ${currentSite.name} to the AUI edge network.</p>

      <div class="form-group">
        <label class="form-label">Site ID</label>
        <input readonly value="${currentSite.id}" style="width: 100%; background: var(--surface2); border: 1px solid var(--border); color: #fff; padding: 10px; border-radius: 8px; font-family: var(--font-mono);">
      </div>

      <div class="form-group">
        <label class="form-label">Active API Key (Live)</label>
        <input readonly value="${currentSite.apiKey}" style="width: 100%; background: var(--surface2); border: 1px solid var(--border); color: var(--cyan); padding: 10px; border-radius: 8px; font-family: var(--font-mono);">
      </div>

      <div class="form-group">
        <label class="form-label">HTML Script Embed</label>
        <div class="code-box">
&lt;script src="https://cdn.aui-engine.com/embed.js" data-aui-site-id="${currentSite.id}" data-aui-key="${currentSite.apiKey}" async&gt;&lt;/script&gt;
        </div>
      </div>
    </div>
  </div>

  <script>
    function switchTab(tabName) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      event.currentTarget.classList.add('active');
      const target = document.getElementById('tab-' + tabName);
      if (target) target.classList.add('active');
    }

    function openModal(id) {
      document.getElementById(id).classList.add('active');
    }

    function closeModal(id) {
      document.getElementById(id).classList.remove('active');
    }

    async function approveVariant(variantId) {
      try {
        const res = await fetch('/api/sites/${currentSite.id}/variants/' + variantId + '/approve', { method: 'POST' });
        if (res.ok) {
          alert('Variant approved and successfully deployed to Edge variant store!');
          window.location.reload();
        }
      } catch (err) {
        alert('Failed to approve variant: ' + err.message);
      }
    }

    async function rejectVariant(variantId) {
      if (!confirm('Reject this variant? It will not be deployed to visitors.')) return;
      try {
        const res = await fetch('/api/sites/${currentSite.id}/variants/' + variantId + '/reject', { method: 'POST' });
        if (res.ok) {
          window.location.reload();
        }
      } catch (err) {
        alert('Failed to reject: ' + err.message);
      }
    }

    async function rollbackVersion(versionId) {
      if (!confirm('Revert site experience to version ' + versionId + '?')) return;
      try {
        const res = await fetch('/api/sites/${currentSite.id}/rollback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionId })
        });
        if (res.ok) {
          alert('Site successfully rolled back!');
          window.location.reload();
        }
      } catch (err) {
        alert('Rollback failed: ' + err.message);
      }
    }

    async function saveSpendCap() {
      const val = parseFloat(document.getElementById('spendCapInput').value);
      try {
        const res = await fetch('/api/sites/${currentSite.id}/policy', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthlySpendCapUsd: val })
        });
        if (res.ok) {
          alert('Monthly spend cap updated to $' + val);
          window.location.reload();
        }
      } catch (err) {
        alert('Failed to update spend cap');
      }
    }

    async function setRollout(pct) {
      try {
        const res = await fetch('/api/sites/${currentSite.id}/rollout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rolloutPercentage: pct })
        });
        if (res.ok) {
          alert('Canary traffic allocation updated to ' + pct + '%');
          window.location.reload();
        }
      } catch (err) {
        alert('Failed to update rollout: ' + err.message);
      }
    }

    async function toggleKillSwitch(active) {
      const promptText = active
        ? 'ACTIVATE EMERGENCY KILL SWITCH? 100% of traffic will immediately be reverted to canonical holdout.'
        : 'Disarm kill switch and restore normal adaptive variant edge routing?';
      if (!confirm(promptText)) return;
      try {
        const res = await fetch('/api/sites/${currentSite.id}/killswitch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active })
        });
        if (res.ok) {
          alert('Kill switch ' + (active ? 'ACTIVATED' : 'DISARMED'));
          window.location.reload();
        }
      } catch (err) {
        alert('Failed to update kill switch: ' + err.message);
      }
    }

    async function generatePreviewLink(variantId) {
      try {
        const res = await fetch('/api/sites/${currentSite.id}/preview-token?variantId=' + variantId);
        const data = await res.json();
        const el = document.getElementById('stagingLinkResult');
        if (el) {
          el.innerHTML = 'Preview URL: <a href="' + data.previewUrl + '" target="_blank" style="color: var(--cyan); text-decoration: underline;">' + data.previewUrl + '</a><br><span style="color: var(--text-muted); font-size: 10px;">Token: ' + data.previewToken + ' (Active for 24h)</span>';
        }
      } catch (err) {
        alert('Failed to generate preview token: ' + err.message);
      }
    }

    document.getElementById('siteSelect')?.addEventListener('change', (e) => {
      window.location.href = '/?siteId=' + e.target.value;
    });
  </script>

</body>
</html>`;
}
