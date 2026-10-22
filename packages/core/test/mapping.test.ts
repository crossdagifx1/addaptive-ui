import { describe, it, expect } from "vitest";
import {
  getByPath,
  mapComponentProps,
  ComponentMapper,
  createComponentMapper,
  type ComponentMappingConfig,
} from "../src/index.js";

describe("@aui/core — Component Mapping Engine", () => {
  const sampleBlueprintProps = {
    headline: "Transform Your Web Experience with AI",
    subheadline: "Model-agnostic personalization with zero locked-zone compromises.",
    primaryCta: {
      label: "Start Free Pilot",
      action: "navigate:/signup",
    },
    badge: {
      text: "New Feature",
      active: true,
    },
    metrics: [
      { label: "Uptime", value: "99.99%" },
      { label: "Latency", value: "12ms" },
    ],
  };

  describe("getByPath", () => {
    it("retrieves nested properties using dot notation", () => {
      expect(getByPath(sampleBlueprintProps, "headline")).toBe("Transform Your Web Experience with AI");
      expect(getByPath(sampleBlueprintProps, "primaryCta.label")).toBe("Start Free Pilot");
      expect(getByPath(sampleBlueprintProps, "primaryCta.action")).toBe("navigate:/signup");
      expect(getByPath(sampleBlueprintProps, "metrics.0.value")).toBe("99.99%");
    });

    it("safely returns undefined for non-existent paths without throwing", () => {
      expect(getByPath(sampleBlueprintProps, "nonExistent.sub.path")).toBeUndefined();
      expect(getByPath(null, "headline")).toBeUndefined();
      expect(getByPath(undefined, "headline")).toBeUndefined();
    });
  });

  describe("mapComponentProps", () => {
    it("maps blueprint props to customer component props using string mappings", () => {
      const config: ComponentMappingConfig = {
        blueprintType: "HeroSection",
        targetComponent: "MyCorporateHero",
        propMappings: {
          title: "headline",
          subtitle: "subheadline",
          ctaButtonText: "primaryCta.label",
          ctaHref: "primaryCta.action",
        },
      };

      const mapped = mapComponentProps(sampleBlueprintProps, config);
      expect(mapped.title).toBe("Transform Your Web Experience with AI");
      expect(mapped.subtitle).toBe("Model-agnostic personalization with zero locked-zone compromises.");
      expect(mapped.ctaButtonText).toBe("Start Free Pilot");
      expect(mapped.ctaHref).toBe("navigate:/signup");
    });

    it("applies PropTransformRule with default values and transform functions", () => {
      const config: ComponentMappingConfig = {
        blueprintType: "HeroSection",
        targetComponent: "MyCustomHero",
        defaultProps: {
          theme: "dark-luxury",
        },
        propMappings: {
          headerTitle: {
            targetProp: "headerTitle",
            sourcePath: "headline",
            transform: (val: string) => val.toUpperCase(),
          },
          buttonConfig: {
            targetProp: "buttonConfig",
            sourcePath: "primaryCta",
            transform: (cta: any) => ({
              text: cta?.label || "Explore",
              target: cta?.action?.replace("navigate:", "") || "/",
            }),
          },
          missingPropWithDefault: {
            targetProp: "missingPropWithDefault",
            sourcePath: "nonExistent",
            defaultValue: "Default Corporate Slogan",
          },
        },
      };

      const mapped = mapComponentProps(sampleBlueprintProps, config);
      expect(mapped.theme).toBe("dark-luxury");
      expect(mapped.headerTitle).toBe("TRANSFORM YOUR WEB EXPERIENCE WITH AI");
      expect(mapped.buttonConfig).toEqual({
        text: "Start Free Pilot",
        target: "/signup",
      });
      expect(mapped.missingPropWithDefault).toBe("Default Corporate Slogan");
    });
  });

  describe("ComponentMapper Class", () => {
    it("registers and retrieves mappings case-insensitively", () => {
      const mapper = createComponentMapper();
      const heroConfig: ComponentMappingConfig = {
        blueprintType: "hero",
        targetComponent: "AcmeHero",
        propMappings: {
          title: "headline",
        },
      };

      mapper.register(heroConfig);

      expect(mapper.has("hero")).toBe(true);
      expect(mapper.has("HERO")).toBe(true);
      expect(mapper.has("AcmeHero")).toBe(true);

      const mapped = mapper.mapProps("hero", { headline: "Hello World" });
      expect(mapped.title).toBe("Hello World");

      // Fallback for unmapped type returns original props
      const unmapped = mapper.mapProps("unknownComponent", { foo: "bar" });
      expect(unmapped).toEqual({ foo: "bar" });
    });
  });
});
