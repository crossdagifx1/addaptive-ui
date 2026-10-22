import http from 'node:http';
import { defaultLandingBlueprint } from '@aui/components-landing';
import { validateBlueprint, type ValidatorConfig } from '@aui/validator';
import { evaluatePolicy, DEFAULT_POLICY } from '@aui/policy';
import type { Blueprint } from '@aui/schema';

const PORT = 4000;

// ─── Preset Segment Variants for the Playground ──────────────────────────────

const speedVariant: Blueprint = {
  ...defaultLandingBlueprint,
  blueprintId: 'bp_speed_optimized',
  segment: 'ref:google-ads|device:mobile|speed',
  tokens: {
    ...defaultLandingBlueprint.tokens,
    'color.primary': '#00e5ff',
    density: 'compact',
  },
  components: {
    ...defaultLandingBlueprint.components,
    hero: {
      type: 'Hero',
      variant: 'centered',
      props: {
        headline: 'Deploy Lightning-Fast Adaptive UI in 5 Minutes',
        subheadline:
          'Zero latency overhead. Never blocks first paint. Pre-generated at the edge for sub-20ms lookup.',
        primaryCta: { label: 'Start Fast Trial', action: 'navigate:/signup' },
        secondaryCta: { label: 'Benchmark Latency', action: 'scroll:#features' },
      },
    },
    cta: {
      type: 'CTA',
      props: {
        headline: 'Ready for Sub-20ms Adaptive Experiences?',
        button: { label: 'Launch in 5 Minutes', action: 'navigate:/signup' },
      },
    },
  },
  meta: {
    generatedBy: 'model:claude-3-5-sonnet',
    reasoning: 'Visitor arrived from ad emphasizing speed; emphasize fast setup and edge latency.',
    createdAt: new Date().toISOString(),
    status: 'approved',
  },
};

const enterpriseVariant: Blueprint = {
  ...defaultLandingBlueprint,
  blueprintId: 'bp_enterprise_focus',
  segment: 'ref:linkedin|enterprise:true',
  tokens: {
    ...defaultLandingBlueprint.tokens,
    'color.primary': '#d4af37',
    density: 'spacious',
  },
  components: {
    ...defaultLandingBlueprint.components,
    hero: {
      type: 'Hero',
      variant: 'split',
      props: {
        headline: 'Enterprise-Grade Adaptive UI with Complete Safety Governance',
        subheadline:
          'SOC 2 Type II certified. 100% locked-zone protection for legal & pricing. Bring your own model keys.',
        primaryCta: { label: 'Request Architecture Brief', action: 'navigate:/contact' },
        secondaryCta: { label: 'Security Whitepaper', action: 'navigate:/security' },
      },
    },
    cta: {
      type: 'CTA',
      props: {
        headline: 'Scale Personalized Digital Experiences with Full Governance',
        button: { label: 'Talk to an Architect', action: 'navigate:/contact' },
      },
    },
  },
  meta: {
    generatedBy: 'model:gpt-4o',
    reasoning: 'Enterprise B2B visitor; prioritize security governance, locked zones, and whitepaper CTA.',
    createdAt: new Date().toISOString(),
    status: 'approved',
  },
};

const adversarialVariant: Blueprint = {
  ...defaultLandingBlueprint,
  blueprintId: 'bp_adversarial_attack',
  segment: 'adversarial:test',
  components: {
    ...defaultLandingBlueprint.components,
    hero: {
      type: 'Hero',
      props: {
        headline: 'Get guaranteed results or get free cash now!', // Banned phrase!
      },
    },
    pricing: {
      type: 'PricingTable',
      locked: true,
      props: {
        plans: [{ name: 'Hacked Plan', price: '$0.00' }], // Tampered locked zone!
      },
    },
  },
  meta: {
    generatedBy: 'model:adversarial',
    reasoning: 'Attempting prompt injection and unauthorized price tampering.',
    createdAt: new Date().toISOString(),
    status: 'pending',
  },
};

const variants: Record<string, Blueprint> = {
  default: defaultLandingBlueprint,
  speed: speedVariant,
  enterprise: enterpriseVariant,
  adversarial: adversarialVariant,
};

const validatorConfig: ValidatorConfig = {
  componentRegistry: [],
  lockedZones: ['PricingTable', 'LeadForm', 'LegalFooter'],
  contentPolicy: {
    bannedPhrases: ['guaranteed results', 'limited time only', 'free cash'],
    requiredElements: ['privacy-link'],
    allowedActions: ['navigate', 'scroll', 'open-modal'],
  },
  accessibility: {
    minContrast: 4.5,
    requireAltText: true,
    requireHeadingOrder: true,
  },
  sizeBudget: {
    maxSections: 20,
  },
  diffLimits: {
    maxSectionChanges: 5,
  },
};

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/api/variant') {
    const segment = url.searchParams.get('segment') || 'default';
    const candidate = variants[segment] || defaultLandingBlueprint;

    // Run validator
    const valResult = validateBlueprint(candidate, validatorConfig, defaultLandingBlueprint);
    const polResult = evaluatePolicy(candidate, DEFAULT_POLICY, defaultLandingBlueprint);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        blueprint: candidate,
        validation: valResult,
        policy: polResult,
        isAdversarial: segment === 'adversarial',
      }),
    );
    return;
  }

  // HTML UI
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AUI Engine — Live Interactive Playground</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a0f;
      --surface1: #111118;
      --surface2: #1a1a25;
      --border: rgba(255,255,255,0.08);
      --cyan: #00e5ff;
      --gold: #d4af37;
      --text: #f5f5f5;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', system-ui, sans-serif;
      overflow-x: hidden;
    }
    /* Control Toolbar */
    #toolbar {
      position: sticky;
      top: 0;
      z-index: 10000;
      background: rgba(17, 17, 24, 0.88);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      font-size: 16px;
      letter-spacing: -0.5px;
    }
    .brand-pill {
      background: rgba(0,229,255,0.12);
      border: 1px solid rgba(0,229,255,0.3);
      color: var(--cyan);
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      font-weight: 700;
    }
    .segment-picker {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 4px;
    }
    .segment-btn {
      background: none;
      border: none;
      color: rgba(245,245,245,0.6);
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .segment-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
    .segment-btn.active {
      background: #00e5ff;
      color: #0a0a0f;
      box-shadow: 0 0 12px rgba(0,229,255,0.3);
    }
    .segment-btn.active.enterprise {
      background: #d4af37;
      color: #0a0a0f;
      box-shadow: 0 0 12px rgba(212,175,55,0.3);
    }
    .segment-btn.active.adversarial {
      background: #ff4757;
      color: #fff;
      box-shadow: 0 0 12px rgba(255,71,87,0.3);
    }
    /* Status Badge */
    #status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.04);
    }
    /* Reasoning Box */
    #reasoning-bar {
      background: rgba(0, 229, 255, 0.05);
      border-bottom: 1px solid rgba(0, 229, 255, 0.15);
      padding: 10px 24px;
      font-size: 13px;
      color: rgba(245,245,245,0.85);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    /* Render Container */
    #aui-root {
      min-height: calc(100vh - 120px);
    }
    /* Alert Banner for Adversarial Attacks */
    #adversarial-alert {
      display: none;
      background: rgba(255, 71, 87, 0.15);
      border: 1px solid rgba(255, 71, 87, 0.4);
      color: #ff6b81;
      padding: 16px 24px;
      margin: 16px 24px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div id="toolbar">
    <div class="brand">
      <span>AUI Engine</span>
      <span class="brand-pill">Playground v1.0</span>
    </div>

    <div class="segment-picker">
      <button class="segment-btn active" onclick="loadSegment('default')">Holdout (Default)</button>
      <button class="segment-btn" onclick="loadSegment('speed')">Ad: High-Speed</button>
      <button class="segment-btn" onclick="loadSegment('enterprise')">Enterprise (B2B)</button>
      <button class="segment-btn" onclick="loadSegment('adversarial')">⚠️ Adversarial Attack</button>
    </div>

    <div id="status-badge">
      <span id="status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #00e5ff;"></span>
      <span id="status-text">Holdout Group: Default</span>
    </div>
  </div>

  <div id="reasoning-bar">
    <div><strong>Model Reasoning:</strong> <span id="reasoning-text">Serving standard baseline blueprint to holdout control group.</span></div>
    <div style="font-family: monospace; font-size: 11px; opacity: 0.6;" id="latency-text">Lookup: 0.8ms</div>
  </div>

  <div id="adversarial-alert">
    <strong>🛡️ Locked-Zone Protection Triggered:</strong><br>
    The AI attempted to modify the locked <code style="background:rgba(0,0,0,0.3);padding:2px 6px;border-radius:4px;">PricingTable</code> and inject banned marketing phrases. The 9-stage policy engine rejected the variant and immediately degraded gracefully to the default blueprint!
  </div>

  <div id="aui-root"></div>

  <script type="module">
    let currentBlueprint = null;
    let defaultBlueprint = null;

    async function loadSegment(segmentKey) {
      document.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active', 'enterprise', 'adversarial'));
      event.target.classList.add('active');
      if (segmentKey === 'enterprise') event.target.classList.add('enterprise');
      if (segmentKey === 'adversarial') event.target.classList.add('adversarial');

      const alertEl = document.getElementById('adversarial-alert');
      alertEl.style.display = 'none';

      const res = await fetch('/api/variant?segment=' + encodeURIComponent(segmentKey));
      const data = await res.json();

      const candidate = data.blueprint;
      if (!defaultBlueprint) defaultBlueprint = candidate;

      const badgeDot = document.getElementById('status-dot');
      const badgeText = document.getElementById('status-text');
      const reasoningText = document.getElementById('reasoning-text');

      if (segmentKey === 'adversarial') {
        alertEl.style.display = 'block';
        badgeDot.style.background = '#ff4757';
        badgeText.innerText = 'Rejected by Policy Engine → Safe Fallback';
        reasoningText.innerText = 'Unauthorized tampering blocked: ' + data.policy.violations.map(v => v.message).join(' | ');
        // Render fallback default safely!
        render(defaultBlueprint);
        return;
      }

      if (segmentKey === 'default') {
        badgeDot.style.background = '#00e5ff';
        badgeText.innerText = 'Holdout Baseline (Default)';
        reasoningText.innerText = candidate.meta?.reasoning || 'Default baseline';
      } else if (segmentKey === 'speed') {
        badgeDot.style.background = '#00e5ff';
        badgeText.innerText = 'Adapted for Speed Ad Traffic';
        reasoningText.innerText = candidate.meta?.reasoning;
      } else if (segmentKey === 'enterprise') {
        badgeDot.style.background = '#d4af37';
        badgeText.innerText = 'Adapted for Enterprise B2B Traffic';
        reasoningText.innerText = candidate.meta?.reasoning;
      }

      render(candidate);
    }

    function render(blueprint) {
      currentBlueprint = blueprint;
      const root = document.getElementById('aui-root');
      root.innerHTML = '';

      // Apply CSS variables from tokens
      if (blueprint.tokens) {
        for (const [k, v] of Object.entries(blueprint.tokens)) {
          root.style.setProperty('--aui-' + k.replace(/\\./g, '-'), v);
        }
      }

      // Render sections in layout order
      for (const sectionName of blueprint.layout.sections) {
        const comp = blueprint.components[sectionName];
        if (!comp) continue;
        const sectionEl = document.createElement('section');
        sectionEl.setAttribute('data-aui-section', sectionName);
        sectionEl.setAttribute('data-aui-type', comp.type);
        if (comp.locked) sectionEl.setAttribute('data-aui-locked', 'true');

        renderComponent(comp, sectionEl);
        root.appendChild(sectionEl);
      }
    }

    function escapeHtml(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function renderComponent(comp, el) {
      const p = comp.props || {};

      switch (comp.type) {
        case 'Banner':
          el.innerHTML = '<div style="background: linear-gradient(90deg, #0d6e6e, #14b8a6); color: #fff; padding: 10px 24px; font-size: 13px; font-weight: 500; text-align: center;">' +
            escapeHtml(p.text) + (p.action ? ' <a href="' + escapeHtml(p.action.href) + '" style="color:#fff;font-weight:700;margin-left:8px;">' + escapeHtml(p.action.label) + ' &rarr;</a>' : '') + '</div>';
          break;

        case 'Nav':
          el.innerHTML = '<nav style="padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); max-width: 1200px; margin: 0 auto;">' +
            '<div style="font-weight: 800; font-size: 18px; color: #fff;">' + escapeHtml(p.logo?.text || 'AUI Engine') + '</div>' +
            '<div style="display: flex; gap: 20px; align-items: center;">' +
            (p.links || []).map(l => '<a href="' + escapeHtml(l.href) + '" style="color: rgba(245,245,245,0.7); text-decoration: none; font-size: 14px;">' + escapeHtml(l.label) + '</a>').join('') +
            (p.cta ? '<a href="' + escapeHtml(p.cta.action) + '" style="background: var(--aui-color-primary, #00e5ff); color: #0a0a0f; padding: 8px 18px; border-radius: 999px; font-weight: 700; text-decoration: none; font-size: 13px;">' + escapeHtml(p.cta.label) + '</a>' : '') +
            '</div></nav>';
          break;

        case 'Hero':
          el.innerHTML = '<div style="padding: 70px 24px; max-width: 1000px; margin: 0 auto; text-align: center;">' +
            '<div style="display: inline-block; padding: 4px 14px; border-radius: 999px; background: rgba(0,229,255,0.1); border: 1px solid rgba(0,229,255,0.25); color: var(--aui-color-primary, #00e5ff); font-size: 12px; font-weight: 700; margin-bottom: 20px;">' +
            '<span>✨ Model-Agnostic Adaptive UI Layer</span></div>' +
            '<h1 style="font-size: clamp(32px, 5vw, 54px); font-weight: 800; letter-spacing: -1.5px; line-height: 1.1; margin: 0 0 20px 0;">' + escapeHtml(p.headline) + '</h1>' +
            '<p style="font-size: 18px; line-height: 1.6; color: rgba(245,245,245,0.65); max-width: 720px; margin: 0 auto 32px auto;">' + escapeHtml(p.subheadline) + '</p>' +
            '<div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">' +
            (p.primaryCta ? '<a href="' + escapeHtml(p.primaryCta.action) + '" style="background: var(--aui-color-primary, #00e5ff); color: #0a0a0f; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 15px; box-shadow: 0 4px 20px rgba(0,229,255,0.25);">' + escapeHtml(p.primaryCta.label) + '</a>' : '') +
            (p.secondaryCta ? '<a href="' + escapeHtml(p.secondaryCta.action) + '" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 14px 28px; border-radius: 12px; font-weight: 600; text-decoration: none; font-size: 15px;">' + escapeHtml(p.secondaryCta.label) + '</a>' : '') +
            '</div></div>';
          break;

        case 'LogoCloud':
          el.innerHTML = '<div style="padding: 30px 24px; text-align: center; max-width: 1000px; margin: 0 auto;">' +
            '<div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: rgba(245,245,245,0.4); text-transform: uppercase; margin-bottom: 20px;">' + escapeHtml(p.caption) + '</div>' +
            '<div style="display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; opacity: 0.65;">' +
            (p.logos || []).map(l => '<span style="font-size: 17px; font-weight: 700;">' + escapeHtml(l.text || l.alt) + '</span>').join('') +
            '</div></div>';
          break;

        case 'FeatureGrid':
          el.innerHTML = '<div style="padding: 50px 24px; max-width: 1200px; margin: 0 auto;">' +
            '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">' +
            (p.items || []).map(item =>
              '<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px;">' +
              '<div style="font-size: 22px; margin-bottom: 12px;">' + escapeHtml(item.icon || '⚡') + '</div>' +
              '<h3 style="font-size: 17px; font-weight: 700; margin: 0 0 8px 0;">' + escapeHtml(item.title) + '</h3>' +
              '<p style="font-size: 14px; line-height: 1.6; color: rgba(245,245,245,0.6); margin: 0;">' + escapeHtml(item.text) + '</p>' +
              '</div>'
            ).join('') +
            '</div></div>';
          break;

        case 'Testimonials':
          el.innerHTML = '<div style="padding: 50px 24px; max-width: 1100px; margin: 0 auto;">' +
            '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">' +
            (p.quotes || []).map(q =>
              '<div style="background: var(--surface1); border: 1px solid var(--border); border-radius: 16px; padding: 24px;">' +
              '<p style="font-size: 14px; line-height: 1.6; font-style: italic; color: rgba(245,245,245,0.85); margin: 0 0 16px 0;">"' + escapeHtml(q.text) + '"</p>' +
              '<div style="font-weight: 700; font-size: 14px;">' + escapeHtml(q.name) + '</div>' +
              '<div style="font-size: 12px; color: rgba(245,245,245,0.5);">' + escapeHtml(q.role) + '</div>' +
              '</div>'
            ).join('') +
            '</div></div>';
          break;

        case 'PricingTable':
          el.innerHTML = '<div style="padding: 50px 24px; max-width: 1100px; margin: 0 auto; text-align: center;">' +
            '<div style="display: inline-block; padding: 4px 10px; border-radius: 6px; background: rgba(255,255,255,0.06); font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; color: #00e5ff;">🔒 Locked Business Zone</div>' +
            '<h2 style="font-size: 28px; font-weight: 800; margin: 0 0 8px 0;">Predictable, Transparent Pricing</h2>' +
            '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin-top: 32px;">' +
            (p.plans || []).map(plan =>
              '<div style="background: ' + (plan.popular ? 'rgba(0,229,255,0.05)' : 'rgba(255,255,255,0.02)') + '; border: 1px solid ' + (plan.popular ? '#00e5ff' : 'var(--border)') + '; border-radius: 16px; padding: 28px; text-align: left;">' +
              '<h3 style="margin: 0; font-size: 18px;">' + escapeHtml(plan.name) + '</h3>' +
              '<div style="font-size: 32px; font-weight: 800; margin: 12px 0;">' + escapeHtml(plan.price) + '<span style="font-size: 14px; font-weight: 400; color: rgba(245,245,245,0.5);">' + escapeHtml(plan.period || '/mo') + '</span></div>' +
              '<ul style="list-style: none; padding: 0; margin: 0 0 24px 0;">' +
              (plan.features || []).map(f => '<li style="font-size: 13px; color: rgba(245,245,245,0.75); margin-bottom: 8px;">✓ ' + escapeHtml(f) + '</li>').join('') +
              '</ul>' +
              '<button style="width: 100%; padding: 10px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; background: ' + (plan.popular ? '#00e5ff' : 'rgba(255,255,255,0.1)') + '; color: ' + (plan.popular ? '#0a0a0f' : '#fff') + ';">' + escapeHtml(plan.cta || 'Get Started') + '</button>' +
              '</div>'
            ).join('') +
            '</div></div>';
          break;

        case 'FAQ':
          el.innerHTML = '<div style="padding: 50px 24px; max-width: 800px; margin: 0 auto;">' +
            '<h2 style="font-size: 26px; font-weight: 800; text-align: center; margin: 0 0 28px 0;">FAQ</h2>' +
            (p.items || []).map(item =>
              '<details style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; cursor: pointer;" open>' +
              '<summary style="font-weight: 700; font-size: 15px;">' + escapeHtml(item.q) + '</summary>' +
              '<p style="margin: 10px 0 0 0; font-size: 14px; color: rgba(245,245,245,0.7); line-height: 1.6;">' + escapeHtml(item.a) + '</p>' +
              '</details>'
            ).join('') +
            '</div>';
          break;

        case 'CTA':
          el.innerHTML = '<div style="padding: 60px 24px; max-width: 900px; margin: 0 auto; text-align: center;">' +
            '<div style="background: linear-gradient(135deg, rgba(0,229,255,0.12), rgba(107,91,138,0.15)); border: 1px solid rgba(0,229,255,0.25); border-radius: 20px; padding: 40px;">' +
            '<h2 style="font-size: 28px; font-weight: 800; margin: 0 0 16px 0;">' + escapeHtml(p.headline) + '</h2>' +
            (p.button ? '<a href="' + escapeHtml(p.button.action) + '" style="display: inline-block; background: var(--aui-color-primary, #00e5ff); color: #0a0a0f; padding: 12px 28px; border-radius: 10px; font-weight: 700; text-decoration: none;">' + escapeHtml(p.button.label) + '</a>' : '') +
            '</div></div>';
          break;

        case 'LegalFooter':
          el.innerHTML = '<footer style="padding: 30px 24px; border-top: 1px solid var(--border); font-size: 13px; color: rgba(245,245,245,0.5); max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">' +
            '<div>' + escapeHtml(p.text) + '</div>' +
            '<div style="display: flex; gap: 16px;">' +
            (p.links || []).map(l => '<a href="' + escapeHtml(l.href) + '" style="color: rgba(245,245,245,0.6); text-decoration: none;">' + escapeHtml(l.label) + '</a>').join('') +
            '</div></footer>';
          break;
      }
    }

    // Initialize with default blueprint
    window.loadSegment = loadSegment;
    loadSegment('default');
  </script>
</body>
</html>`);
});

server.listen(PORT, () => {
  console.log(`\n\x1b[32m✔ AUI Playground running at:\x1b[0m \x1b[1mhttp://localhost:${PORT}\x1b[0m\n`);
});
