import * as http from "node:http";
import * as url from "node:url";
import { ControlPlaneStore } from "./store.js";
import { renderDashboardHtml } from "./ui.js";
import { defaultLandingBlueprint } from "@aui/components-landing";

export function createControlPlaneServer(store = new ControlPlaneStore()) {
  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url || "/", "http://localhost");
    const pathname = reqUrl.pathname;
    const method = req.method || "GET";

    // Helper: JSON response
    const json = (data: unknown, statusCode = 200) => {
      res.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      });
      res.end(JSON.stringify(data));
    };

    // Helper: Parse request body
    const parseBody = (): Promise<any> => {
      return new Promise((resolve) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            resolve({});
          }
        });
      });
    };

    // OPTIONS preflight
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      });
      res.end();
      return;
    }

    // Health
    if (pathname === "/api/health") {
      json({ status: "ok", service: "@aui/control-plane", timestamp: new Date().toISOString() });
      return;
    }

    // Dashboard UI
    if (pathname === "/" && method === "GET") {
      const sites = store.listSites();
      const requestedSiteId = reqUrl.searchParams.get("siteId") || sites[0]?.id || "";
      const currentSite = store.getSite(requestedSiteId) || sites[0]!;
      const policy = store.getPolicy(currentSite.id);
      const variants = store.listVariants(currentSite.id);
      const history = store.getVersionHistory(currentSite.id);
      const auditLogs = store.getAuditLogs(currentSite.id);
      const experimentReport = store.getExperimentReport(currentSite.id, "developer-speed");

      const html = renderDashboardHtml({
        sites,
        currentSite,
        policy,
        variants,
        history,
        auditLogs,
        experimentReport,
      });

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }


    // API: Sites
    if (pathname === "/api/sites" && method === "GET") {
      json(store.listSites());
      return;
    }

    if (pathname === "/api/sites" && method === "POST") {
      const body = await parseBody();
      const site = store.createSite(body.name || "New Site", body.domain || "example.com", body.approvalMode);
      json(site, 201);
      return;
    }

    // Site sub-resources: match /api/sites/:siteId/...
    const siteMatch = pathname.match(/^\/api\/sites\/([^/]+)(.*)$/);
    if (siteMatch) {
      const siteId = siteMatch[1];
      const subpath = siteMatch[2];

      const site = store.getSite(siteId);
      if (!site) {
        json({ error: "Site not found" }, 404);
        return;
      }

      // Policy
      if (subpath === "/policy" && method === "GET") {
        json({ policy: store.getPolicy(siteId), monthlySpendCapUsd: site.monthlySpendCapUsd });
        return;
      }

      if (subpath === "/policy" && method === "PUT") {
        const body = await parseBody();
        const updated = store.updatePolicy(siteId, body, body.monthlySpendCapUsd);
        json(updated);
        return;
      }

      // Variants
      if (subpath === "/variants" && method === "GET") {
        json(store.listVariants(siteId));
        return;
      }

      // Approve variant: /api/sites/:siteId/variants/:variantId/approve
      const approveMatch = subpath.match(/^\/variants\/([^/]+)\/approve$/);
      if (approveMatch && method === "POST") {
        const variantId = approveMatch[1];
        const updated = store.approveVariant(variantId);
        if (!updated) {
          json({ error: "Variant not found" }, 404);
          return;
        }
        json({ status: "approved", variant: updated });
        return;
      }

      // Reject variant: /api/sites/:siteId/variants/:variantId/reject
      const rejectMatch = subpath.match(/^\/variants\/([^/]+)\/reject$/);
      if (rejectMatch && method === "POST") {
        const variantId = rejectMatch[1];
        const updated = store.rejectVariant(variantId);
        if (!updated) {
          json({ error: "Variant not found" }, 404);
          return;
        }
        json({ status: "rejected", variant: updated });
        return;
      }

      // Rollback: /api/sites/:siteId/rollback
      if (subpath === "/rollback" && method === "POST") {
        const body = await parseBody();
        const rollbackEntry = store.rollbackVersion(siteId, body.versionId);
        if (!rollbackEntry) {
          json({ error: "Version not found in history" }, 404);
          return;
        }
        json({ status: "rolled_back", entry: rollbackEntry });
        return;
      }

      // Version History
      if (subpath === "/history" && method === "GET") {
        json(store.getVersionHistory(siteId));
        return;
      }

      // Audit Log
      if (subpath === "/audit-log" && method === "GET") {
        json(store.getAuditLogs(siteId));
        return;
      }

      // Diff
      if (subpath === "/diff" && method === "GET") {
        const variantId = reqUrl.searchParams.get("variantId") || "";
        const variant = store.getVariant(variantId);
        if (!variant) {
          json({ error: "Variant not found" }, 404);
          return;
        }
        json({
          defaultBlueprint: defaultLandingBlueprint,
          candidateBlueprint: variant.blueprint,
          segmentKey: variant.segmentKey,
          lockedZonesProtected: true,
        });
        return;
      }

      // Experimentation & Lift Report
      if (subpath === "/experimentation" && method === "GET") {
        const segmentKey = reqUrl.searchParams.get("segment") || "developer-speed";
        const report = store.getExperimentReport(siteId, segmentKey);
        json(report);
        return;
      }

      // Event Intake Pipeline
      if (subpath === "/events" && method === "POST") {
        const body = await parseBody();
        const event = {
          id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          siteId,
          pageId: body.pageId || "landing",
          sessionId: body.sessionId || `anon_${Math.random().toString(36).substring(2, 8)}`,
          type: body.type || "impression",
          timestamp: new Date().toISOString(),
          group: body.group || "variant",
          segmentKey: body.segmentKey || "developer-speed",
          blueprintId: body.blueprintId || "",
          goalId: body.goalId,
          properties: body.properties,
        };
        store.recordAnalyticsEvent(event);
        json({ status: "recorded", eventId: event.id }, 202);
        return;
      }

      // Rollout Controls: /api/sites/:siteId/rollout
      if (subpath === "/rollout" && method === "POST") {
        const body = await parseBody();
        const updated = store.setRolloutPercentage(siteId, Number(body.rolloutPercentage) ?? 100);
        json({ status: "updated", rolloutPercentage: updated?.rolloutPercentage });
        return;
      }

      // Kill Switch: /api/sites/:siteId/killswitch
      if (subpath === "/killswitch" && method === "POST") {
        const body = await parseBody();
        const updated = store.setKillSwitch(siteId, Boolean(body.active));
        json({ status: "updated", isKillSwitchActive: updated?.isKillSwitchActive });
        return;
      }

      // Staging Preview: /api/sites/:siteId/preview-token
      if (subpath === "/preview-token" && method === "GET") {
        const variantId = reqUrl.searchParams.get("variantId") || "";
        const previewToken = `prev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const previewUrl = `https://${site.domain}/?aui_preview=${variantId}&token=${previewToken}`;
        store.addAuditLog(siteId, "preview_generated", "admin", { variantId, previewToken });
        json({ previewToken, previewUrl });
        return;
      }

      // Budget & Spend Caps: /api/sites/:siteId/budget
      if (subpath === "/budget" && method === "GET") {
        json(store.getBudget(siteId));
        return;
      }

      if (subpath === "/budget" && method === "PUT") {
        const body = await parseBody();
        const updated = store.setMonthlyCap(siteId, Number(body.monthlyCapUsd) || 100, Number(body.warningThreshold) || 80);
        json(updated);
        return;
      }

      // Webhooks: /api/sites/:siteId/webhooks
      if (subpath === "/webhooks" && method === "GET") {
        json(store.listWebhooks(siteId));
        return;
      }

      if (subpath === "/webhooks" && method === "POST") {
        const body = await parseBody();
        const sub = store.addWebhook(siteId, body.url, body.events || ["blueprint.applied"], body.secret);
        json(sub, 201);
        return;
      }

      // AI Generation Traces & Replay: /api/sites/:siteId/traces
      if (subpath === "/traces" && method === "GET") {
        json(store.listTraces(siteId));
        return;
      }

      if (subpath.startsWith("/traces/") && subpath.endsWith("/replay") && method === "POST") {
        const parts = subpath.split("/");
        const traceId = parts[2] || "";
        const replay = store.replayTrace(traceId);
        if (!replay) {
          json({ error: "Trace not found or invalid" }, 404);
          return;
        }
        json(replay);
        return;
      }
    }

    json({ error: "Not found" }, 404);

  });

  return {
    server,
    store,
    listen(port = 4100): Promise<number> {
      return new Promise((resolve) => {
        server.listen(port, () => {
          const addr = server.address();
          const actualPort = typeof addr === "object" && addr ? addr.port : port;
          console.log(`\n========================================================`);
          console.log(`  AUI CONTROL PLANE RUNNING AT: http://localhost:${actualPort}`);
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
  const app = createControlPlaneServer();
  const port = parseInt(process.env.PORT || "4100", 10);
  app.listen(port);
}
