import * as http from "node:http";
import { DOC_SECTIONS } from "./docs-data.js";
import { renderDocsPage } from "./ui.js";

export function createDocsServer() {
  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url || "/", "http://localhost");
    const pathname = reqUrl.pathname;
    const method = req.method || "GET";

    // Health
    if (pathname === "/api/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "@aui/docs", timestamp: new Date().toISOString() }));
      return;
    }

    // Search API
    if (pathname === "/api/search") {
      const q = reqUrl.searchParams.get("q")?.toLowerCase().trim() || "";
      const results = DOC_SECTIONS.filter(
        (s) => s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q)
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(results));
      return;
    }

    // Root -> /docs/quickstart
    if (pathname === "/" || pathname === "/docs") {
      res.writeHead(302, { Location: "/docs/quickstart" });
      res.end();
      return;
    }

    // Section doc view: /docs/:id
    const docMatch = pathname.match(/^\/docs\/([^/]+)$/);
    if (docMatch && method === "GET") {
      const sectionId = docMatch[1];
      const section = DOC_SECTIONS.find((s) => s.id === sectionId) || DOC_SECTIONS[0]!;
      const html = renderDocsPage(section);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  });

  return {
    server,
    listen(port = 4002): Promise<number> {
      return new Promise((resolve) => {
        server.listen(port, () => {
          const addr = server.address();
          const actualPort = typeof addr === "object" && addr ? addr.port : port;
          console.log(`\n========================================================`);
          console.log(`  AUI DOCS SITE RUNNING AT: http://localhost:${actualPort}`);
          console.log(`========================================================\n`);
          resolve(actualPort);
        });
      });
    },
    close(): Promise<void> {
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

// Start standalone if executed directly
const isDirectCall = import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`;
if (isDirectCall || process.argv[1]?.endsWith("server.js")) {
  const app = createDocsServer();
  const port = parseInt(process.env.PORT || "4002", 10);
  app.listen(port);
}
