import { DOC_SECTIONS, type DocSection } from "./docs-data.js";

export function renderDocsPage(currentSection: DocSection): string {
  const categories = ["Getting Started", "Core Concepts", "Guides", "Security", "API Reference"] as const;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentSection.title} — AUI Engine Documentation</title>
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
      --gold: #d4af37;
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
      line-height: 1.6;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* Header */
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
      text-decoration: none;
      color: #fff;
    }
    .logo-badge {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, var(--cyan), var(--gold));
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 14px;
      color: #000;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 700;
    }
    .header-links {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .search-input {
      background: var(--surface2);
      border: 1px solid var(--border);
      color: #fff;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      width: 220px;
      transition: all 0.2s;
    }
    .search-input:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 10px rgba(0, 229, 255, 0.2);
    }
    .nav-link {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: color 0.2s;
    }
    .nav-link:hover { color: var(--cyan); }

    /* Layout */
    .docs-layout {
      display: flex;
      flex: 1;
      max-width: 1440px;
      width: 100%;
      margin: 0 auto;
    }

    /* Sidebar */
    aside {
      width: 280px;
      border-right: 1px solid var(--border);
      padding: 32px 24px;
      background: rgba(17, 17, 24, 0.4);
      flex-shrink: 0;
      height: calc(100vh - 61px);
      position: sticky;
      top: 61px;
      overflow-y: auto;
    }
    .sidebar-category {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-dim);
      font-weight: 700;
      margin: 20px 0 8px 12px;
    }
    .sidebar-category:first-child { margin-top: 0; }
    .sidebar-link {
      display: block;
      padding: 8px 12px;
      border-radius: 8px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.15s;
    }
    .sidebar-link:hover {
      background: var(--surface2);
      color: var(--text);
    }
    .sidebar-link.active {
      background: rgba(0, 229, 255, 0.1);
      color: var(--cyan);
      font-weight: 600;
      border-left: 2px solid var(--cyan);
    }

    /* Main Content */
    main {
      flex: 1;
      padding: 40px 60px;
      max-width: 900px;
    }

    h2 { font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-bottom: 16px; color: #fff; }
    h3 { font-size: 20px; font-weight: 700; margin: 32px 0 12px; color: #fff; }
    p { margin-bottom: 16px; color: var(--text-muted); font-size: 15px; }
    ol, ul { margin: 0 0 20px 24px; color: var(--text-muted); font-size: 15px; }
    li { margin-bottom: 8px; }
    strong { color: var(--text); font-weight: 600; }

    /* Code & Callouts */
    pre {
      background: #050508;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px 20px;
      margin: 16px 0 24px;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 13px;
      color: #94a3b8;
    }
    code {
      font-family: var(--font-mono);
      font-size: 13px;
      background: var(--surface2);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--cyan);
    }
    pre code {
      background: none;
      padding: 0;
      color: inherit;
    }

    .callout {
      border-radius: 12px;
      padding: 18px 22px;
      margin: 24px 0;
      font-size: 14px;
      border: 1px solid transparent;
    }
    .callout-info {
      background: rgba(0, 229, 255, 0.08);
      border-color: rgba(0, 229, 255, 0.25);
      color: #bfefff;
    }
    .callout-success {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.25);
      color: #a7f3d0;
    }

    /* Tables */
    .docs-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0 32px;
      font-size: 13px;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .docs-table th {
      background: var(--surface2);
      padding: 12px 16px;
      color: var(--text);
      text-align: left;
      font-weight: 600;
      border-bottom: 1px solid var(--border);
    }
    .docs-table td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
    }
    .docs-table tr:last-child td { border-bottom: none; }

    .pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
    }
    .pill-emerald { background: rgba(16, 185, 129, 0.2); color: var(--emerald); border: 1px solid rgba(16, 185, 129, 0.4); }
  </style>
</head>
<body>

  <header>
    <a href="/" class="brand">
      <div class="logo-badge">AU</div>
      <div class="brand-title">AUI Engine Docs</div>
    </a>

    <div class="header-links">
      <input type="text" id="searchInput" class="search-input" placeholder="Search documentation...">
      <a href="http://localhost:4000" class="nav-link" target="_blank">Live Playground ↗</a>
      <a href="http://localhost:4100" class="nav-link" target="_blank">Control Plane ↗</a>
      <a href="https://github.com" class="nav-link" target="_blank">GitHub ↗</a>
    </div>
  </header>

  <div class="docs-layout">
    <aside>
      ${categories.map((cat) => `
        <div class="sidebar-category">${cat}</div>
        ${DOC_SECTIONS.filter((s) => s.category === cat).map((s) => `
          <a href="/docs/${s.id}" class="sidebar-link ${s.id === currentSection.id ? "active" : ""}">
            ${s.title}
          </a>
        `).join("")}
      `).join("")}
    </aside>

    <main>
      ${currentSection.contentHtml}
    </main>
  </div>

  <script>
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.sidebar-link').forEach(link => {
        const text = link.textContent.toLowerCase();
        link.style.display = text.includes(q) ? 'block' : 'none';
      });
    });
  </script>
</body>
</html>`;
}
