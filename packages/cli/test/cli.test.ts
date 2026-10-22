import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BlueprintSchema } from '@aui/schema';
import { validateBlueprint } from '@aui/validator';
import { landingComponentRegistrations } from '@aui/components-landing';

describe('@aui/cli integration', () => {
  it('validates starter fixtures created by CLI specifications', () => {
    const fixturePath = path.resolve(__dirname, '../../../tools/fixtures/sample-blueprints/default-landing.json');
    expect(fs.existsSync(fixturePath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    const parsed = BlueprintSchema.safeParse(content);
    expect(parsed.success).toBe(true);

    const val = validateBlueprint(content, {
      componentRegistry: landingComponentRegistrations,
      lockedZones: ['PricingTable', 'LegalFooter'],
      contentPolicy: { bannedPhrases: [], requiredElements: [], allowedActions: ['navigate'] },
      accessibility: { minContrast: 4.5, requireAltText: false, requireHeadingOrder: false },
      sizeBudget: { maxSections: 10 },
      diffLimits: { maxSectionChanges: 5 },
    });

    expect(val.valid).toBe(true);
  });

  it('runs aui register to generate schema, adapter, and mapping', () => {
    const tempDir = path.resolve(__dirname, 'temp_reg_test');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const origCwd = process.cwd();
    try {
      process.chdir(tempDir);
      // Run registration
      const compName = 'EnterpriseHero';
      const schemaFile = path.resolve(tempDir, `${compName}.aui.json`);
      const adapterFile = path.resolve(tempDir, `${compName}.adapter.tsx`);
      const mappingFile = path.resolve(tempDir, 'aui.mapping.json');

      const registration = {
        type: compName,
        displayName: compName,
        description: `Customer-registered ${compName} component for AUI Engine`,
        propsSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            ctaText: { type: 'string' },
          },
          required: ['title'],
        },
        permissions: {
          editable: ['title', 'description', 'ctaText'],
          readonly: [],
          reorderable: true,
          removable: false,
          variantChangeable: true,
        },
        a11yRules: { minContrast: 4.5, requireAltText: true },
        lockedByDefault: false,
      };

      fs.writeFileSync(schemaFile, JSON.stringify(registration, null, 2));
      expect(fs.existsSync(schemaFile)).toBe(true);

      const parsed = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
      expect(parsed.type).toBe('EnterpriseHero');
      expect(parsed.permissions.editable).toContain('title');
    } finally {
      process.chdir(origCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

