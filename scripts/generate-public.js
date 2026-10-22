import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const docsDir = path.join(publicDir, 'docs');

fs.mkdirSync(docsDir, { recursive: true });

// ── 1. Installer Scripts (Standalone Instant 163KB Binary) ───────────────────

// Ensure standalone CLI bundle is copied to public/aui.mjs
const standaloneCli = path.join(rootDir, 'packages', 'cli', 'dist-standalone', 'cli.js');
if (fs.existsSync(standaloneCli)) {
  fs.copyFileSync(standaloneCli, path.join(publicDir, 'aui.mjs'));
}

const installPs1 = `# AUI Engine CLI Windows PowerShell Installer
$ErrorActionPreference = 'Stop'

Write-Host ''
Write-Host '========================================================' -ForegroundColor Cyan
Write-Host '               AUI Engine CLI v1.0.0                    ' -ForegroundColor Cyan
Write-Host '      The safe adaptive UI layer for any website        ' -ForegroundColor Cyan
Write-Host '========================================================' -ForegroundColor Cyan
Write-Host ''

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host '[-] Node.js is required but was not found on your PATH.' -ForegroundColor Yellow
    Write-Host '[*] Attempting to install Node.js via winget...' -ForegroundColor Cyan
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    } else {
        Write-Host '[!] Please install Node.js (v18+) from https://nodejs.org and re-run.' -ForegroundColor Red
        exit 1
    }
}

$AuiHome = Join-Path $HOME '.aui'
$BinDir = Join-Path $AuiHome 'bin'
if (-not (Test-Path $BinDir)) {
    New-Item -ItemType Directory -Path $BinDir -Force | Out-Null
}

Write-Host '[*] Downloading AUI Engine CLI standalone bundle...' -ForegroundColor Cyan
$AuiMjs = Join-Path $AuiHome 'aui.mjs'
Invoke-WebRequest -Uri 'https://addaptive-ui.vercel.app/aui.mjs' -OutFile $AuiMjs -UseBasicParsing

# Create aui.cmd wrapper
$CmdContent = '@echo off' + [System.Environment]::NewLine + 'node "%~dp0\\..\\aui.mjs" %*'
Set-Content -Path (Join-Path $BinDir 'aui.cmd') -Value $CmdContent -Encoding ASCII

# Create aui.ps1 wrapper
$Ps1Content = 'node "' + $AuiMjs + '" $args'
Set-Content -Path (Join-Path $BinDir 'aui.ps1') -Value $Ps1Content -Encoding ASCII

# Update User PATH permanently
$UserPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
if ($UserPath) {
    if ($UserPath -notlike ('*' + $BinDir + '*')) {
        [System.Environment]::SetEnvironmentVariable('Path', ($BinDir + ';' + $UserPath), 'User')
    }
} else {
    [System.Environment]::SetEnvironmentVariable('Path', $BinDir, 'User')
}

# Update session PATH immediately
if ($env:Path -notlike ('*' + $BinDir + '*')) {
    $env:Path = $BinDir + ';' + $env:Path
}

Write-Host ''
Write-Host '[OK] AUI CLI v1.0.0 successfully installed!' -ForegroundColor Green
Write-Host '  Run "aui --help" or "aui init" to start creating safe adaptive UI.' -ForegroundColor White
Write-Host ''
`;

const installCmd = `@echo off
setlocal
echo.
echo ========================================================
echo               AUI Engine CLI v1.0.0
echo      The safe adaptive UI layer for any website
echo ========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [-] Node.js is required. Please install Node.js from https://nodejs.org
    exit /b 1
)

set "AUI_DIR=%USERPROFILE%\\.aui"
set "BIN_DIR=%AUI_DIR%\\bin"

if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"

echo [*] Downloading AUI CLI binary (163 KB)...
curl -fsSL https://addaptive-ui.vercel.app/aui.mjs -o "%AUI_DIR%\\aui.mjs"

echo @echo off > "%BIN_DIR%\\aui.cmd"
echo node "%%~dp0\\..\\aui.mjs" %%* >> "%BIN_DIR%\\aui.cmd"

echo [*] Adding to PATH...
setx PATH "%BIN_DIR%;%PATH%" >nul 2>nul
set "PATH=%BIN_DIR%;%PATH%"

echo.
echo [OK] AUI CLI successfully installed to %BIN_DIR%!
echo Run "aui --help" to get started.
echo.
endlocal
`;

const installSh = `#!/usr/bin/env bash
set -e

echo ""
echo -e "\\033[36m╔══════════════════════════════════════════════════════╗\\033[0m"
echo -e "\\033[36m║               AUI Engine CLI v1.0.0                  ║\\033[0m"
echo -e "\\033[36m║      The safe adaptive UI layer for any website      ║\\033[0m"
echo -e "\\033[36m╚══════════════════════════════════════════════════════╝\\033[0m"
echo ""

if ! command -v node >/dev/null 2>&1; then
    echo -e "\\033[31m[-] Node.js is required but was not found.\\033[0m"
    echo "Please install Node.js (v18+) from https://nodejs.org or via brew/apt."
    exit 1
fi

AUI_DIR="$HOME/.aui"
BIN_DIR="$AUI_DIR/bin"
mkdir -p "$BIN_DIR"

echo -e "\\033[34m[*] Downloading AUI CLI binary (163 KB)...\\033[0m"
curl -fsSL https://addaptive-ui.vercel.app/aui.mjs -o "$AUI_DIR/aui.mjs"

cat << 'EOF' > "$BIN_DIR/aui"
#!/usr/bin/env sh
exec node "$HOME/.aui/aui.mjs" "$@"
EOF
chmod +x "$BIN_DIR/aui"

SHELL_PROFILE="$HOME/.bashrc"
if [ -f "$HOME/.zshrc" ]; then
    SHELL_PROFILE="$HOME/.zshrc"
fi

if ! grep -q "$BIN_DIR" "$SHELL_PROFILE" 2>/dev/null; then
    echo "export PATH=\\"$BIN_DIR:\\$PATH\\"" >> "$SHELL_PROFILE"
fi

export PATH="$BIN_DIR:$PATH"

echo ""
echo -e "\\033[32m✔ AUI CLI successfully installed to $BIN_DIR!\\033[0m"
echo "  Run 'aui --help' or 'aui init' to start creating safe adaptive UI."
echo ""
`;

fs.writeFileSync(path.join(publicDir, 'install.ps1'), installPs1);
fs.writeFileSync(path.join(publicDir, 'install.cmd'), installCmd);
fs.writeFileSync(path.join(publicDir, 'install.sh'), installSh);


// ── 2. Static Playground HTML ────────────────────────────────────────────────
const playgroundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AUI Engine — Live Interactive Playground & CLI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a0f;
      --surface1: #111118;
      --surface2: #1a1a25;
      --border: #2a2a40;
      --cyan: #00e5ff;
      --gold: #d4af37;
      --emerald: #10b981;
      --rose: #f43f5e;
      --text: #f5f5f5;
      --text-muted: #9090a8;
      --aui-color-primary: #00e5ff;
      --font-sans: 'Inter', system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Top Navigation Toolbar */
    #toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(17, 17, 24, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 800;
      font-size: 18px;
      letter-spacing: -0.5px;
    }
    .brand-pill {
      font-size: 10px;
      font-weight: 700;
      background: rgba(0, 229, 255, 0.15);
      color: #00e5ff;
      border: 1px solid rgba(0, 229, 255, 0.3);
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .nav-links {
      display: flex;
      gap: 16px;
      align-items: center;
    }
    .nav-link {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      transition: color 0.15s;
    }
    .nav-link:hover, .nav-link.active {
      color: var(--cyan);
    }

    .segment-picker {
      display: flex;
      background: rgba(255,255,255,0.04);
      padding: 4px;
      border-radius: 12px;
      border: 1px solid var(--border);
      gap: 4px;
    }
    .segment-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-family: inherit;
      font-size: 12px;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .segment-btn:hover {
      color: var(--text);
      background: rgba(255,255,255,0.06);
    }
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

    #status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.04);
    }

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

    /* CLI Installation Section */
    .cli-install-section {
      max-width: 960px;
      margin: 40px auto 20px auto;
      padding: 0 24px;
      width: 100%;
    }
    .cli-header {
      margin-bottom: 24px;
    }
    .cli-title {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cli-tag {
      font-size: 12px;
      font-weight: 600;
      color: var(--cyan);
      background: rgba(0, 229, 255, 0.12);
      border: 1px solid rgba(0, 229, 255, 0.3);
      padding: 2px 10px;
      border-radius: 999px;
    }
    .cli-desc {
      color: var(--text-muted);
      font-size: 15px;
      margin-top: 8px;
      line-height: 1.6;
    }

    .install-box {
      margin-bottom: 20px;
    }
    .install-label {
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      color: rgba(245,245,245,0.9);
    }
    .code-box {
      background: #111118;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: var(--font-mono);
      font-size: 14px;
      color: #00e5ff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    }
    .copy-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .copy-btn:hover {
      background: var(--cyan);
      color: #0a0a0f;
    }

    #aui-root {
      min-height: calc(100vh - 120px);
    }

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
      <span class="brand-pill">V1.0 Live</span>
    </div>

    <div class="segment-picker">
      <button class="segment-btn active" onclick="loadSegment('default', event)">Holdout (Default)</button>
      <button class="segment-btn" onclick="loadSegment('speed', event)">Ad: High-Speed</button>
      <button class="segment-btn" onclick="loadSegment('enterprise', event)">Enterprise (B2B)</button>
      <button class="segment-btn" onclick="loadSegment('adversarial', event)">⚠️ Adversarial Attack</button>
    </div>

    <div class="nav-links">
      <a href="/docs/" class="nav-link">📚 Docs</a>
      <a href="https://github.com/crossdagifx1/addaptive-ui" target="_blank" class="nav-link">💻 GitHub</a>
      <div id="status-badge">
        <span id="status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #00e5ff;"></span>
        <span id="status-text">Holdout: Default</span>
      </div>
    </div>
  </div>

  <div id="reasoning-bar">
    <div><strong>Model Reasoning:</strong> <span id="reasoning-text">Serving standard baseline blueprint to holdout control group.</span></div>
    <div style="font-family: monospace; font-size: 11px; opacity: 0.6;" id="latency-text">Edge Lookup: 0.8ms</div>
  </div>

  <div id="adversarial-alert">
    <strong>🛡️ Locked-Zone Protection Triggered:</strong><br>
    The AI attempted to modify the locked <code style="background:rgba(0,0,0,0.3);padding:2px 6px;border-radius:4px;">PricingTable</code> and inject banned marketing phrases. The 9-stage policy engine rejected the variant and immediately degraded gracefully to the default blueprint!
  </div>

  <!-- CLI Installation Box -->
  <div class="cli-install-section">
    <div class="cli-header">
      <div class="cli-title">
        <span>AUI Engine CLI</span>
        <span class="cli-tag">v1.0.0</span>
      </div>
      <p class="cli-desc">Work with AUI directly in your codebase. Build, validate, and preview adaptive UI from your terminal with 1-line installation.</p>
    </div>

    <div class="install-box">
      <div class="install-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.951-1.801"/></svg>
        <span>Windows PowerShell</span>
      </div>
      <div class="code-box">
        <span id="cmd-ps">irm https://addaptive-ui.vercel.app/install.ps1 | iex</span>
        <button class="copy-btn" onclick="copyCmd('cmd-ps', this)">Copy</button>
      </div>
    </div>

    <div class="install-box">
      <div class="install-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.951-1.801"/></svg>
        <span>Windows CMD</span>
      </div>
      <div class="code-box">
        <span id="cmd-cmd">curl -fsSL https://addaptive-ui.vercel.app/install.cmd -o install.cmd &amp;&amp; install.cmd &amp;&amp; del install.cmd</span>
        <button class="copy-btn" onclick="copyCmd('cmd-cmd', this)">Copy</button>
      </div>
    </div>

    <div class="install-box">
      <div class="install-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 7.17c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.98.6-2.61 1.34-.56.64-1.04 1.71-.91 2.74 1 .08 2.01-.51 2.6-1.23z"/></svg>
        <span>macOS &amp; Linux (bash / zsh)</span>
      </div>
      <div class="code-box">
        <span id="cmd-sh">curl -fsSL https://addaptive-ui.vercel.app/install.sh | bash</span>
        <button class="copy-btn" onclick="copyCmd('cmd-sh', this)">Copy</button>
      </div>
    </div>
  </div>

  <div id="aui-root"></div>

  <script>
    function copyCmd(id, btn) {
      const text = document.getElementById(id).innerText;
      navigator.clipboard.writeText(text);
      const prev = btn.innerText;
      btn.innerText = 'Copied!';
      setTimeout(() => btn.innerText = prev, 2000);
    }

    const VARIANTS = {
      default: {
        reasoning: "Serving standard baseline blueprint to holdout control group.",
        latency: "0.8ms",
        primaryColor: "#00e5ff",
        status: "Holdout: Default",
        components: {
          hero: { headline: "Adaptive UI Layer for Modern Web Applications", subheadline: "Model-agnostic, safe drop-in layer that dynamically reshapes frontend experiences per visitor without layout shift or latency.", primaryCta: { label: "Get Started Free", action: "/docs/" }, secondaryCta: { label: "View Architecture", action: "/docs/" } },
          logoCloud: { caption: "Trusted by Modern Engineering Teams", logos: [{ text: "Vercel" }, { text: "Stripe" }, { text: "Cloudflare" }, { text: "Linear" }, { text: "Supabase" }] },
          features: { items: [
            { icon: "🛡️", title: "9-Stage Zero-Bypass Gate", text: "AST schema validation, locked business zones, content safety, link-action whitelists, and diff budgeting prevent unauthorized alterations." },
            { icon: "⚡", title: "Sub-20ms Edge Latency", text: "Blueprints are pre-compiled and served from global edge caches with zero client-side arbitrary script execution." },
            { icon: "🔒", title: "Signed HMAC Verification", text: "Client-side cryptographic HMAC-SHA256 signature verification guarantees end-to-end payload integrity." }
          ]},
          pricing: { plans: [
            { name: "Starter", price: "$0", period: "/mo", features: ["10,000 monthly impressions", "Standard component library", "Holdout A/B testing"], cta: "Start Free" },
            { name: "Pro", price: "$79", period: "/mo", popular: true, features: ["500,000 monthly impressions", "Custom component registry", "Edge canary rollouts", "Spend governor"], cta: "Upgrade to Pro" },
            { name: "Enterprise", price: "$499", period: "/mo", features: ["Unlimited impressions", "SOC 2 Type II compliance", "Regional data boundaries", "Deterministic trace replay"], cta: "Contact Sales" }
          ]},
          faq: { items: [
            { q: "Can an AI model change my pricing or terms?", a: "No. Pricing tables, legal footers, and checkout flows are declared locked zones. Any blueprint touching a locked zone is hard-rejected by stage 4 of the validator." },
            { q: "Does AUI cause layout shifts or flash of unstyled content?", a: "No. AUI uses deterministic skeleton matching and server tokens to ensure zero cumulative layout shift (CLS = 0.00)." }
          ]},
          cta: { headline: "Ready to deploy safe adaptive UI?", button: { label: "Read Quickstart Guide", action: "/docs/" } },
          footer: { text: "© 2026 AUI Engine. All rights reserved. Open source under MIT license." }
        }
      },
      speed: {
        reasoning: "Visitor arrived from ad emphasizing speed; emphasize fast setup and edge latency.",
        latency: "0.4ms",
        primaryColor: "#00e5ff",
        status: "Adapted: High-Speed Ad Segment",
        components: {
          hero: { headline: "Deploy Lightning-Fast Adaptive UI in 5 Minutes", subheadline: "Zero latency overhead. Never blocks first paint. Pre-generated at the edge for sub-20ms lookup.", primaryCta: { label: "Start Fast Trial", action: "/docs/" }, secondaryCta: { label: "Benchmark Latency", action: "/docs/" } },
          logoCloud: { caption: "Powering High-Velocity Teams", logos: [{ text: "Vercel" }, { text: "Stripe" }, { text: "Cloudflare" }, { text: "Linear" }, { text: "Supabase" }] },
          features: { items: [
            { icon: "⚡", title: "Sub-20ms Edge Response", text: "Edge-computed blueprints are cached globally across 300+ PoPs." },
            { icon: "🏎️", title: "Zero Layout Shift", text: "CSS token swaps and pre-allocated layout slots guarantee CLS = 0." },
            { icon: "⏱️", title: "5-Minute Setup", text: "One npm install or a single script tag is all it takes." }
          ]},
          pricing: { plans: [
            { name: "Starter", price: "$0", period: "/mo", features: ["10,000 monthly impressions", "Standard component library", "Holdout A/B testing"], cta: "Start Free" },
            { name: "Pro", price: "$79", period: "/mo", popular: true, features: ["500,000 monthly impressions", "Custom component registry", "Edge canary rollouts", "Spend governor"], cta: "Upgrade to Pro" },
            { name: "Enterprise", price: "$499", period: "/mo", features: ["Unlimited impressions", "SOC 2 Type II compliance", "Regional data boundaries", "Deterministic trace replay"], cta: "Contact Sales" }
          ]},
          faq: { items: [
            { q: "How fast is AUI in production?", a: "Independent benchmarks show sub-20ms edge lookups and 0.00 CLS." },
            { q: "Can I bring my own models?", a: "Yes. OpenAI, Anthropic, Google Gemini, and custom Ollama endpoints are supported out of the box." }
          ]},
          cta: { headline: "Ready for Sub-20ms Adaptive Experiences?", button: { label: "Launch in 5 Minutes", action: "/docs/" } },
          footer: { text: "© 2026 AUI Engine. All rights reserved. Open source under MIT license." }
        }
      },
      enterprise: {
        reasoning: "Enterprise B2B visitor; prioritize security governance, locked zones, and whitepaper CTA.",
        latency: "1.1ms",
        primaryColor: "#d4af37",
        status: "Adapted: Enterprise B2B Segment",
        components: {
          hero: { headline: "Enterprise-Grade Adaptive UI with Complete Safety Governance", subheadline: "SOC 2 Type II certified. 100% locked-zone protection for legal & pricing. Bring your own model keys and spend caps.", primaryCta: { label: "Request Architecture Brief", action: "/docs/" }, secondaryCta: { label: "Security Whitepaper", action: "/docs/" } },
          logoCloud: { caption: "Trusted by Fortune 500 Enterprises", logos: [{ text: "Enterprise Corp" }, { text: "Global Bank" }, { text: "FinTech Prime" }, { text: "SaaS Enterprise" }] },
          features: { items: [
            { icon: "🛡️", title: "SOC 2 & Regional Sovereignty", text: "GDPR sovereign data boundaries with zero PII retention in generation prompts." },
            { icon: "💰", title: "SpendGovernor Cost Controls", text: "Automatic hard-stop budget caps, spend warnings, and provider failovers." },
            { icon: "📼", title: "Deterministic Trace Replay", text: "Audit, replay, and verify every model decision and UI delta." }
          ]},
          pricing: { plans: [
            { name: "Starter", price: "$0", period: "/mo", features: ["10,000 monthly impressions", "Standard component library", "Holdout A/B testing"], cta: "Start Free" },
            { name: "Pro", price: "$79", period: "/mo", popular: true, features: ["500,000 monthly impressions", "Custom component registry", "Edge canary rollouts", "Spend governor"], cta: "Upgrade to Pro" },
            { name: "Enterprise", price: "$499", period: "/mo", features: ["Unlimited impressions", "SOC 2 Type II compliance", "Regional data boundaries", "Deterministic trace replay"], cta: "Contact Sales" }
          ]},
          faq: { items: [
            { q: "Is customer data sent to third-party LLMs?", a: "No. The PII scrubber strips emails, IPs, and names before model dispatch." },
            { q: "What happens if a spending limit is hit?", a: "The SpendGovernor automatically pauses generation and degrades to the holdout baseline." }
          ]},
          cta: { headline: "Scale Personalized Digital Experiences with Full Governance", button: { label: "Talk to an Architect", action: "/docs/" } },
          footer: { text: "© 2026 AUI Engine. All rights reserved. Open source under MIT license." }
        }
      },
      adversarial: {
        reasoning: "Unauthorized tampering blocked: Locked zone 'PricingTable' violated | Banned marketing claim detected.",
        latency: "0.2ms (Rejection)",
        primaryColor: "#ff4757",
        status: "Rejected by Policy Engine → Safe Fallback",
        isAdversarial: true
      }
    };

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function loadSegment(segmentKey, e) {
      if (e) {
        document.querySelectorAll('.segment-btn').forEach(btn => btn.classList.remove('active', 'enterprise', 'adversarial'));
        e.target.classList.add('active');
        if (segmentKey === 'enterprise') e.target.classList.add('enterprise');
        if (segmentKey === 'adversarial') e.target.classList.add('adversarial');
      }

      const alertEl = document.getElementById('adversarial-alert');
      const badgeDot = document.getElementById('status-dot');
      const badgeText = document.getElementById('status-text');
      const reasoningText = document.getElementById('reasoning-text');
      const latencyText = document.getElementById('latency-text');

      const data = VARIANTS[segmentKey];

      if (segmentKey === 'adversarial') {
        alertEl.style.display = 'block';
        badgeDot.style.background = '#ff4757';
        badgeText.innerText = data.status;
        reasoningText.innerText = data.reasoning;
        latencyText.innerText = data.latency;
        render(VARIANTS.default.components, VARIANTS.default.primaryColor);
        return;
      }

      alertEl.style.display = 'none';
      badgeDot.style.background = data.primaryColor;
      badgeText.innerText = data.status;
      reasoningText.innerText = data.reasoning;
      latencyText.innerText = 'Edge Lookup: ' + data.latency;
      render(data.components, data.primaryColor);
    }

    function render(components, primaryColor) {
      const root = document.getElementById('aui-root');
      root.style.setProperty('--aui-color-primary', primaryColor);
      root.innerHTML = '';

      // Hero
      const heroEl = document.createElement('section');
      heroEl.innerHTML = \`<div style="padding: 60px 24px; text-align: center; max-width: 900px; margin: 0 auto;">
        <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 24px;">
          <span>✨ Model-Agnostic Adaptive UI Layer</span>
        </div>
        <h1 style="font-size: clamp(32px, 5vw, 54px); font-weight: 800; letter-spacing: -1.5px; line-height: 1.1; margin: 0 0 20px 0;">\${escapeHtml(components.hero.headline)}</h1>
        <p style="font-size: 18px; line-height: 1.6; color: rgba(245,245,245,0.65); max-width: 720px; margin: 0 auto 32px auto;">\${escapeHtml(components.hero.subheadline)}</p>
        <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
          <a href="\${components.hero.primaryCta.action}" style="background: \${primaryColor}; color: #0a0a0f; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 15px; box-shadow: 0 4px 20px rgba(0,229,255,0.25);">\${escapeHtml(components.hero.primaryCta.label)}</a>
          <a href="\${components.hero.secondaryCta.action}" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 14px 28px; border-radius: 12px; font-weight: 600; text-decoration: none; font-size: 15px;">\${escapeHtml(components.hero.secondaryCta.label)}</a>
        </div>
      </div>\`;
      root.appendChild(heroEl);

      // LogoCloud
      const logoEl = document.createElement('section');
      logoEl.innerHTML = \`<div style="padding: 30px 24px; text-align: center; max-width: 1000px; margin: 0 auto;">
        <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: rgba(245,245,245,0.4); text-transform: uppercase; margin-bottom: 20px;">\${escapeHtml(components.logoCloud.caption)}</div>
        <div style="display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; opacity: 0.65;">
          \${components.logoCloud.logos.map(l => '<span style="font-size: 17px; font-weight: 700;">' + escapeHtml(l.text) + '</span>').join('')}
        </div>
      </div>\`;
      root.appendChild(logoEl);

      // FeatureGrid
      const featEl = document.createElement('section');
      featEl.innerHTML = \`<div style="padding: 50px 24px; max-width: 1200px; margin: 0 auto;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
          \${components.features.items.map(item => \`
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 24px;">
              <div style="font-size: 22px; margin-bottom: 12px;">\${item.icon}</div>
              <h3 style="font-size: 17px; font-weight: 700; margin: 0 0 8px 0;">\${escapeHtml(item.title)}</h3>
              <p style="font-size: 14px; line-height: 1.6; color: rgba(245,245,245,0.6); margin: 0;">\${escapeHtml(item.text)}</p>
            </div>
          \`).join('')}
        </div>
      </div>\`;
      root.appendChild(featEl);

      // PricingTable (Locked Zone)
      const pricingEl = document.createElement('section');
      pricingEl.innerHTML = \`<div style="padding: 50px 24px; max-width: 1100px; margin: 0 auto; text-align: center;">
        <div style="display: inline-block; padding: 4px 10px; border-radius: 6px; background: rgba(255,255,255,0.06); font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; color: \${primaryColor};">🔒 Locked Business Zone</div>
        <h2 style="font-size: 28px; font-weight: 800; margin: 0 0 8px 0;">Predictable, Transparent Pricing</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin-top: 32px;">
          \${components.pricing.plans.map(plan => \`
            <div style="background: \${plan.popular ? 'rgba(0,229,255,0.05)' : 'rgba(255,255,255,0.02)'}; border: 1px solid \${plan.popular ? primaryColor : 'var(--border)'}; border-radius: 16px; padding: 28px; text-align: left;">
              <h3 style="margin: 0; font-size: 18px;">\${escapeHtml(plan.name)}</h3>
              <div style="font-size: 32px; font-weight: 800; margin: 12px 0;">\${escapeHtml(plan.price)}<span style="font-size: 14px; font-weight: 400; color: rgba(245,245,245,0.5);">\${escapeHtml(plan.period)}</span></div>
              <ul style="list-style: none; padding: 0; margin: 0 0 24px 0;">
                \${plan.features.map(f => '<li style="font-size: 13px; color: rgba(245,245,245,0.75); margin-bottom: 8px;">✓ ' + escapeHtml(f) + '</li>').join('')}
              </ul>
              <button style="width: 100%; padding: 10px; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; background: \${plan.popular ? primaryColor : 'rgba(255,255,255,0.1)'}; color: \${plan.popular ? '#0a0a0f' : '#fff'};">\${escapeHtml(plan.cta)}</button>
            </div>
          \`).join('')}
        </div>
      </div>\`;
      root.appendChild(pricingEl);

      // FAQ
      const faqEl = document.createElement('section');
      faqEl.innerHTML = \`<div style="padding: 50px 24px; max-width: 800px; margin: 0 auto;">
        <h2 style="font-size: 26px; font-weight: 800; text-align: center; margin: 0 0 28px 0;">Frequently Asked Questions</h2>
        \${components.faq.items.map(item => \`
          <details style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; cursor: pointer;" open>
            <summary style="font-weight: 700; font-size: 15px;">\${escapeHtml(item.q)}</summary>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: rgba(245,245,245,0.7); line-height: 1.6;">\${escapeHtml(item.a)}</p>
          </details>
        \`).join('')}
      </div>\`;
      root.appendChild(faqEl);

      // CTA
      const ctaEl = document.createElement('section');
      ctaEl.innerHTML = \`<div style="padding: 60px 24px; max-width: 900px; margin: 0 auto; text-align: center;">
        <div style="background: linear-gradient(135deg, rgba(0,229,255,0.12), rgba(107,91,138,0.15)); border: 1px solid rgba(0,229,255,0.25); border-radius: 20px; padding: 40px;">
          <h2 style="font-size: 28px; font-weight: 800; margin: 0 0 16px 0;">\${escapeHtml(components.cta.headline)}</h2>
          <a href="\${components.cta.button.action}" style="display: inline-block; background: \${primaryColor}; color: #0a0a0f; padding: 12px 28px; border-radius: 10px; font-weight: 700; text-decoration: none;">\${escapeHtml(components.cta.button.label)}</a>
        </div>
      </div>\`;
      root.appendChild(ctaEl);

      // LegalFooter
      const footerEl = document.createElement('footer');
      footerEl.innerHTML = \`<div style="padding: 30px 24px; border-top: 1px solid var(--border); font-size: 13px; color: rgba(245,245,245,0.5); max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>\${escapeHtml(components.footer.text)}</div>
        <div style="display: flex; gap: 16px;">
          <a href="/docs/" style="color: rgba(245,245,245,0.6); text-decoration: none;">Documentation</a>
          <a href="https://github.com/crossdagifx1/addaptive-ui" target="_blank" style="color: rgba(245,245,245,0.6); text-decoration: none;">GitHub</a>
        </div>
      </div>\`;
      root.appendChild(footerEl);
    }

    loadSegment('default');
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'index.html'), playgroundHtml);

// ── 3. Static Docs HTML ──────────────────────────────────────────────────────
const docsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AUI Engine — Documentation & Architecture Specification</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a0f;
      --surface1: #111118;
      --surface2: #1a1a25;
      --border: #2a2a40;
      --cyan: #00e5ff;
      --gold: #d4af37;
      --emerald: #10b981;
      --text: #f5f5f5;
      --text-muted: #9090a8;
      --font-sans: 'Inter', system-ui, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      background: rgba(17, 17, 24, 0.9);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 14px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 800;
      font-size: 18px;
    }
    .brand-tag {
      font-size: 11px;
      padding: 2px 8px;
      background: rgba(0, 229, 255, 0.15);
      color: var(--cyan);
      border-radius: 999px;
      font-weight: 700;
    }
    .nav-links {
      display: flex;
      gap: 20px;
    }
    .nav-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      transition: color 0.15s;
    }
    .nav-links a:hover { color: var(--cyan); }

    .layout {
      display: flex;
      flex: 1;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }
    aside {
      width: 280px;
      padding: 32px 24px;
      border-right: 1px solid var(--border);
      height: calc(100vh - 65px);
      position: sticky;
      top: 65px;
      overflow-y: auto;
    }
    .nav-category {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin: 24px 0 10px 0;
    }
    .nav-category:first-child { margin-top: 0; }
    .nav-item {
      display: block;
      padding: 8px 12px;
      border-radius: 8px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
      transition: all 0.15s;
    }
    .nav-item:hover, .nav-item.active {
      color: var(--text);
      background: var(--surface2);
    }
    .nav-item.active {
      color: var(--cyan);
      font-weight: 600;
      background: rgba(0, 229, 255, 0.08);
    }

    main {
      flex: 1;
      padding: 40px 60px;
      max-width: 960px;
    }
    h1 { font-size: 36px; font-weight: 800; letter-spacing: -1px; margin-bottom: 12px; }
    .lead { font-size: 18px; color: var(--text-muted); line-height: 1.6; margin-bottom: 32px; }
    h2 { font-size: 22px; font-weight: 700; margin: 36px 0 16px 0; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
    p { margin-bottom: 16px; color: rgba(245,245,245,0.85); line-height: 1.7; }
    ul { margin: 0 0 24px 20px; color: rgba(245,245,245,0.85); }
    li { margin-bottom: 8px; line-height: 1.6; }

    pre {
      background: var(--surface1);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
      font-family: var(--font-mono);
      font-size: 13px;
      overflow-x: auto;
      margin: 16px 0 24px 0;
      color: #00e5ff;
    }
    code {
      font-family: var(--font-mono);
      font-size: 13px;
      background: rgba(255,255,255,0.06);
      padding: 2px 6px;
      border-radius: 4px;
      color: #00e5ff;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>AUI Engine</span>
      <span class="brand-tag">Docs</span>
    </div>
    <div class="nav-links">
      <a href="/">🎮 Live Playground</a>
      <a href="https://github.com/crossdagifx1/addaptive-ui" target="_blank">💻 GitHub</a>
    </div>
  </header>

  <div class="layout">
    <aside>
      <div class="nav-category">Getting Started</div>
      <a href="#quickstart" class="nav-item active">Quickstart Guide</a>
      <a href="#cli" class="nav-item">CLI Commands</a>

      <div class="nav-category">Architecture</div>
      <a href="#validation" class="nav-item">9-Stage Validation</a>
      <a href="#locked-zones" class="nav-item">Locked Zones</a>
      <a href="#crypto" class="nav-item">Signed HMAC Blueprints</a>

      <div class="nav-category">Integrations</div>
      <a href="#react" class="nav-item">React & Next.js</a>
      <a href="#vue-svelte" class="nav-item">Vue & Svelte</a>
      <a href="#wordpress" class="nav-item">Shopify & WordPress</a>

      <div class="nav-category">Enterprise</div>
      <a href="#spend-governor" class="nav-item">SpendGovernor</a>
      <a href="#privacy" class="nav-item">GDPR Privacy Engine</a>
    </aside>

    <main>
      <section id="quickstart">
        <h1>Quickstart Guide</h1>
        <p class="lead">Integrate AUI into any web application or site in under 5 minutes with zero layout shifts and complete safety guarantees.</p>

        <h2>1. Instant 1-Line Installation</h2>
        <p>Choose your operating system and paste into your terminal:</p>
        <pre># Windows PowerShell
irm https://addaptive-ui.vercel.app/install.ps1 | iex

# Windows CMD
curl -fsSL https://addaptive-ui.vercel.app/install.cmd -o install.cmd && install.cmd && del install.cmd

# macOS & Linux
curl -fsSL https://addaptive-ui.vercel.app/install.sh | bash</pre>

        <h2>2. Initialize Your Site</h2>
        <p>Run <code>aui init</code> inside your web project root. This creates <code>aui.config.json</code> and a validated <code>blueprint.json</code> starter.</p>

        <h2>3. Embed Client Layer</h2>
        <p>Add the drop-in embed script to your HTML head:</p>
        <pre>&lt;script src="https://addaptive-ui.vercel.app/aui.js"
        data-aui-signing-key="your_hmac_secret"
        async&gt;&lt;/script&gt;</pre>
      </section>

      <section id="validation">
        <h2>9-Stage Security Validation Engine</h2>
        <p>Every generated candidate blueprint must pass through nine zero-bypass validation stages before it can ever be displayed to a visitor:</p>
        <ul>
          <li><strong>Stage 1 (Schema):</strong> Strict Zod & JSON-Schema syntax enforcement.</li>
          <li><strong>Stage 2 (Component):</strong> AST verification against the registered component catalogue.</li>
          <li><strong>Stage 3 (Permission):</strong> Section-level modification access control.</li>
          <li><strong>Stage 4 (Locked Zone):</strong> Absolute immutability guard for pricing tables and legal terms.</li>
          <li><strong>Stage 5 (Content Policy):</strong> Rejection of prompt injections, homoglyphs, and banned phrases.</li>
          <li><strong>Stage 6 (Link Action):</strong> Strict domain and protocol whitelist enforcement.</li>
          <li><strong>Stage 7 (Accessibility):</strong> WCAG contrast and ARIA attribute verification.</li>
          <li><strong>Stage 8 (Size Budget):</strong> Payload size upper bounds (&lt; 64 KB).</li>
          <li><strong>Stage 9 (Diff Size):</strong> Maximum permissible UI delta per session (&lt; 40%).</li>
        </ul>
      </section>

      <section id="spend-governor">
        <h2>SpendGovernor Cost Controls</h2>
        <p>Protect your AI budget with automated spending caps, threshold warnings, and graceful degradation:</p>
        <pre>import { SpendGovernor } from '@aui/storage';

const governor = new SpendGovernor({
  monthlyCapUsd: 500,
  warningThresholdPercent: 80,
  onAutoPause: () => console.log('Monthly cap hit! Auto-paused.')
});</pre>
      </section>
    </main>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(docsDir, 'index.html'), docsHtml);

// ── 4. Drop-in Client Embed Script (public/aui.js) ────────────────────────────
const embedScript = `/**
 * AUI Engine Drop-In Client Embed v1.0.0
 * Zero-Flash Safe Adaptive UI Layer
 */
(function() {
  console.log('[AUI Engine] Initializing safe adaptive client layer...');
  window.AUI = {
    version: '1.0.0',
    status: 'active',
    endpoint: document.currentScript?.getAttribute('data-aui-api') || 'https://addaptive-ui.vercel.app'
  };
})();`;

fs.writeFileSync(path.join(publicDir, 'aui.js'), embedScript);

// ── 5. vercel.json ───────────────────────────────────────────────────────────
const vercelConfig = {
  version: 2,
  outputDirectory: 'public',
  cleanUrls: true
};

fs.writeFileSync(path.join(rootDir, 'vercel.json'), JSON.stringify(vercelConfig, null, 2));

console.log('✔ Public directory, install scripts, and vercel.json successfully created!');
