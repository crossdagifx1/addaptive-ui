import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createDocsServer } from "../src/server.js";
import { DOC_SECTIONS } from "../src/docs-data.js";

describe("@aui/docs", () => {
  it("should have all required documentation chapters", () => {
    expect(DOC_SECTIONS.length).toBeGreaterThanOrEqual(5);

    const titles = DOC_SECTIONS.map((s) => s.id);
    expect(titles).toContain("quickstart");
    expect(titles).toContain("blueprint-schema");
    expect(titles).toContain("security-whitepaper");
    expect(titles).toContain("model-benchmarks");
    expect(titles).toContain("component-authoring");
    expect(titles).toContain("cli-reference");
  });

  describe("HTTP Documentation Server", () => {
    let app: ReturnType<typeof createDocsServer>;
    let baseUrl: string;

    beforeAll(async () => {
      app = createDocsServer();
      const port = await app.listen(0);
      baseUrl = `http://localhost:${port}`;
    });

    afterAll(async () => {
      await app.close();
    });

    it("GET /api/health returns 200 OK", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe("ok");
    });

    it("GET /docs/quickstart returns documentation HTML", async () => {
      const res = await fetch(`${baseUrl}/docs/quickstart`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("15-Minute Quickstart Guide");
      expect(text).toContain("data-aui-site-id");
    });

    it("GET /docs/security-whitepaper describes the 9-stage validation pipeline", async () => {
      const res = await fetch(`${baseUrl}/docs/security-whitepaper`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("The Zero-Tamper Invariant");
      expect(text).toContain("9-Stage Validation Pipeline");
    });

    it("GET /api/search finds matching documentation sections", async () => {
      const res = await fetch(`${baseUrl}/api/search?q=security`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].id).toBe("security-whitepaper");
    });
  });
});
