#!/usr/bin/env node

/**
 * @aui/cli — CLI for AUI Engine
 *
 * Commands:
 *   aui validate <file>  — Validate a blueprint JSON file through all 9 validation stages
 *   aui preview <file>   — Start a local preview server for a blueprint
 *   aui init             — Initialize AUI configuration and starter blueprint
 *   aui register         — Scaffold a custom component registration contract
 *
 * @packageDocumentation
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { BlueprintSchema, type Blueprint } from '@aui/schema';
import { validateBlueprint } from '@aui/validator';
import { landingComponentRegistrations } from '@aui/components-landing';

const args = process.argv.slice(2);
const command = args[0];

function printBanner() {
  console.log(`
\x1b[36m╔══════════════════════════════════════════════════════╗
║               AUI Engine CLI v0.0.1                  ║
║      The safe adaptive UI layer for any website      ║
╚══════════════════════════════════════════════════════╝\x1b[0m
`);
}

switch (command) {
  case 'validate': {
    const filePath = args[1];
    if (!filePath) {
      console.error('\x1b[31mError: Please provide a blueprint JSON path. Example: aui validate ./blueprint.json\x1b[0m');
      process.exit(1);
    }

    const resolved = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolved)) {
      console.error(`\x1b[31mError: File not found at ${resolved}\x1b[0m`);
      process.exit(1);
    }

    try {
      const raw = fs.readFileSync(resolved, 'utf-8');
      const data = JSON.parse(raw);
      console.log(`\x1b[34mValidating blueprint:\x1b[0m ${path.basename(resolved)}...`);

      // 1. Zod Parse
      const parseResult = BlueprintSchema.safeParse(data);
      if (!parseResult.success) {
        console.error('\x1b[31m✖ Schema Validation Failed:\x1b[0m');
        parseResult.error.issues.forEach((issue) => {
          console.error(`  - [${issue.path.join('.') || 'root'}]: ${issue.message}`);
        });
        process.exit(1);
      }

      // 2. Full 9-stage validation
      const validation = validateBlueprint(data as Blueprint, {
        componentRegistry: landingComponentRegistrations,
        lockedZones: ['PricingTable', 'LeadForm', 'LegalFooter'],
        contentPolicy: {
          bannedPhrases: ['guaranteed results', 'limited time only', 'act now or miss out'],
          requiredElements: [],
          allowedActions: ['navigate', 'scroll', 'open-modal', 'submit-form', 'track'],
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
      });

      console.log(`\x1b[32m✔ Stages Executed:\x1b[0m ${validation.stagesRun.join(' → ')}`);
      console.log(`\x1b[32m✔ Duration:\x1b[0m ${validation.durationMs.toFixed(2)}ms`);

      if (validation.valid) {
        console.log('\x1b[32m✔ Blueprint is 100% valid and safe to render!\x1b[0m');
      } else {
        console.error(`\x1b[31m✖ Found ${validation.errors.length} validation errors:\x1b[0m`);
        validation.errors.forEach((err) => {
          console.error(`  • [Stage: ${err.stage}] [${err.code}]: ${err.message}`);
        });
        process.exit(1);
      }
    } catch (err) {
      console.error(`\x1b[31mError parsing JSON:\x1b[0m ${(err as Error).message}`);
      process.exit(1);
    }
    break;
  }

  case 'preview': {
    const filePath = args[1] || 'blueprint.json';
    const portArg = args.indexOf('--port');
    const port = portArg !== -1 && args[portArg + 1] ? parseInt(args[portArg + 1]!, 10) : 3456;

    const resolved = path.resolve(process.cwd(), filePath);
    let blueprintContent = '{}';

    if (fs.existsSync(resolved)) {
      blueprintContent = fs.readFileSync(resolved, 'utf-8');
      console.log(`\x1b[34mLoaded blueprint:\x1b[0m ${resolved}`);
    } else {
      console.log(`\x1b[33mNo file at ${filePath}, serving empty starter container.\x1b[0m`);
    }

    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AUI Blueprint Local Preview</title>
  <style>
    body { margin: 0; background: #0a0a0f; color: #f5f5f5; font-family: system-ui, sans-serif; }
    #preview-bar {
      position: fixed; top: 0; left: 0; right: 0; height: 40px; background: rgba(17,17,24,0.9);
      border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center;
      justify-content: space-between; padding: 0 16px; font-size: 13px; z-index: 9999;
    }
    #preview-content { margin-top: 40px; }
  </style>
</head>
<body>
  <div id="preview-bar">
    <span>⚡ <strong>AUI Engine</strong> Preview — ${escapeHtml(path.basename(resolved))}</span>
    <span style="color: #00e5ff;">Live Sandbox</span>
  </div>
  <div id="preview-content">
    <div id="aui-root"></div>
  </div>
  <script type="application/json" id="aui-blueprint-data">
    ${blueprintContent}
  </script>
</body>
</html>`);
    });

    server.listen(port, () => {
      console.log(`\n\x1b[32m✔ AUI Preview Server running at:\x1b[0m \x1b[1mhttp://localhost:${port}\x1b[0m\n`);
    });
    break;
  }

  case 'init': {
    printBanner();
    const configPath = path.resolve(process.cwd(), 'aui.config.json');
    const blueprintPath = path.resolve(process.cwd(), 'blueprint.json');

    const sampleConfig = {
      siteId: 'site_' + Math.random().toString(36).substring(2, 9),
      mode: 'component-mapping',
      lockedZones: ['PricingTable', 'LeadForm', 'LegalFooter'],
      models: {
        defaultProvider: 'openai',
      },
    };

    const sampleBlueprint: Blueprint = {
      schemaVersion: '1.0',
      blueprintId: 'bp_starter_01',
      pageId: 'home',
      segment: 'default',
      tokens: {
        'color.primary': '#00e5ff',
        'color.surface': '#111118',
        'color.text': '#f5f5f5',
        density: 'comfortable',
      },
      layout: {
        type: 'stack',
        sections: ['hero', 'features', 'cta'],
      },
      components: {
        hero: {
          type: 'Hero',
          props: {
            headline: 'Welcome to your adaptive website',
            subheadline: 'Crafted with AUI Engine for ultra-personalized visitor experiences.',
            primaryCta: { label: 'Explore', action: 'scroll:#features' },
          },
        },
        features: {
          type: 'FeatureGrid',
          props: {
            items: [
              { title: 'Model-Agnostic', text: 'Works with OpenAI, Claude, Gemini, or local models.' },
              { title: 'Locked Safety', text: 'Guaranteed protection for critical business zones.' },
            ],
          },
        },
        cta: {
          type: 'CTA',
          props: {
            headline: 'Ready to personalize?',
            button: { label: 'Get Started', action: 'navigate:/signup' },
          },
        },
      },
      meta: {
        generatedBy: 'cli:init',
        createdAt: new Date().toISOString(),
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
    fs.writeFileSync(blueprintPath, JSON.stringify(sampleBlueprint, null, 2));

    console.log('\x1b[32m✔ Initialized AUI project successfully!\x1b[0m');
    console.log(`  - Created ${path.basename(configPath)}`);
    console.log(`  - Created ${path.basename(blueprintPath)}`);
    console.log('\nRun \x1b[36maui preview blueprint.json\x1b[0m to test locally.');
    break;
  }

  case 'register': {
    const compName = args[1] || 'CustomCard';
    console.log(`\n\x1b[34m[AUI CLI]\x1b[0m Registering component: \x1b[1m${compName}\x1b[0m\n`);

    const schemaFile = path.resolve(process.cwd(), `${compName}.aui.json`);
    const adapterFile = path.resolve(process.cwd(), `${compName}.adapter.tsx`);
    const mappingFile = path.resolve(process.cwd(), 'aui.mapping.json');

    const registration = {
      type: compName,
      displayName: compName,
      description: `Customer-registered ${compName} component for AUI Engine`,
      propsSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Primary headline or card title' },
          description: { type: 'string', description: 'Secondary descriptive copy' },
          ctaText: { type: 'string', description: 'Call-to-action button text' },
          ctaUrl: { type: 'string', description: 'Destination link' },
        },
        required: ['title'],
      },
      permissions: {
        editable: ['title', 'description', 'ctaText', 'ctaUrl'],
        readonly: [],
        reorderable: true,
        removable: false,
        variantChangeable: true,
      },
      a11yRules: {
        minContrast: 4.5,
        requireAltText: true,
      },
      variants: ['default', 'elevated', 'minimal'],
      lockedByDefault: false,
      defaultProps: {
        title: `Default ${compName}`,
        description: 'Standard baseline copy before AI adaptation.',
        ctaText: 'Learn More',
        ctaUrl: '#',
      },
    };

    const adapterCode = `import React from 'react';
import { AUIZone } from '@aui/adapters-ui';
import type { PropTransformRule } from '@aui/core';

export interface ${compName}Props {
  title: string;
  description?: string;
  ctaText?: string;
  ctaUrl?: string;
  className?: string;
}

export function ${compName}(props: ${compName}Props) {
  return (
    <div className={\`aui-custom-\${props.className || 'card'}\`} style={{ padding: 24, borderRadius: 12, border: '1px solid #2a2a40' }}>
      <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>{props.title}</h3>
      {props.description && <p style={{ color: '#9090a8', fontSize: 14, margin: '0 0 16px' }}>{props.description}</p>}
      {props.ctaText && (
        <a href={props.ctaUrl || '#'} style={{ display: 'inline-block', padding: '8px 16px', background: '#00e5ff', color: '#000', borderRadius: 8, fontWeight: 600, textDecoration: 'none' }}>
          {props.ctaText}
        </a>
      )}
    </div>
  );
}

/**
 * Ready-to-use Adaptive Zone wrapper
 */
export function Adaptive${compName}() {
  return (
    <AUIZone
      name="${compName.toLowerCase()}"
      component={${compName}}
      mapping={{
        title: 'headline',
        description: 'subheadline',
        ctaText: 'primaryCta.label',
        ctaUrl: 'primaryCta.action',
      }}
    >
      <${compName}
        title="Standard ${compName}"
        description="Default fallback description when holdout baseline is served."
      />
    </AUIZone>
  );
}
`;

    // Read or initialize aui.mapping.json
    let mappings: Record<string, any> = {};
    if (fs.existsSync(mappingFile)) {
      try {
        mappings = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
      } catch {
        mappings = {};
      }
    }

    mappings[compName.toLowerCase()] = {
      blueprintType: compName.toLowerCase(),
      targetComponent: compName,
      propMappings: {
        title: 'headline',
        description: 'subheadline',
        ctaText: 'primaryCta.label',
        ctaUrl: 'primaryCta.action',
      },
    };

    fs.writeFileSync(schemaFile, JSON.stringify(registration, null, 2));
    fs.writeFileSync(adapterFile, adapterCode);
    fs.writeFileSync(mappingFile, JSON.stringify(mappings, null, 2));

    console.log('\x1b[32m✔ Component registered and mapped successfully!\x1b[0m');
    console.log(`  - Created Contract: ${path.basename(schemaFile)}`);
    console.log(`  - Created React Adapter: ${path.basename(adapterFile)}`);
    console.log(`  - Updated Mapping Config: ${path.basename(mappingFile)}`);
    console.log(`\nImport \x1b[36m<Adaptive${compName} />\x1b[0m in your React application.`);
    break;
  }

  case 'map': {
    const blueprintType = args[1];
    const customerComponent = args[2];

    if (!blueprintType || !customerComponent) {
      console.error('\x1b[31mError:\x1b[0m Usage: aui map <blueprintType> <customComponent>');
      process.exit(1);
    }

    const mappingFile = path.resolve(process.cwd(), 'aui.mapping.json');
    let mappings: Record<string, any> = {};
    if (fs.existsSync(mappingFile)) {
      try {
        mappings = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
      } catch {
        mappings = {};
      }
    }

    mappings[blueprintType.toLowerCase()] = {
      blueprintType: blueprintType.toLowerCase(),
      targetComponent: customerComponent,
      propMappings: {
        title: 'headline',
        subtitle: 'subheadline',
        ctaText: 'primaryCta.label',
        ctaHref: 'primaryCta.action',
      },
    };

    fs.writeFileSync(mappingFile, JSON.stringify(mappings, null, 2));
    console.log(`\x1b[32m✔ Mapped blueprint type "${blueprintType}" to component "${customerComponent}" in aui.mapping.json\x1b[0m`);
    break;
  }

  case '--version':
  case '-v':
    console.log('aui-engine v0.0.1');
    break;

  default:
    printBanner();
    console.log(`Commands:
  aui init                          Initialize AUI on an existing site
  aui validate <blueprint>          Validate a blueprint file through 9 validation stages
  aui preview <blueprint>           Preview a blueprint on a local server
  aui register [name]               Register a customer component with schema, adapter, and mapping
  aui map <blueprintType> <comp>    Map a blueprint section type to customer component


Options:
  --version, -v             Show version
  --help, -h                Show this help
`);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
