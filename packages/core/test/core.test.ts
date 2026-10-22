// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import type { Blueprint, ComponentRegistration } from '@aui/schema';
import {
  createComponentRegistry,
  createFallbackManager,
  createUndoManager,
  createSignalCollector,
  applyTokens,
  renderBlueprint,
  createAUIClient,
} from '../src/index.js';

describe('@aui/core', () => {
  const sampleRegistration: ComponentRegistration = {
    type: 'Card',
    displayName: 'Card',
    description: 'Card block',
    propsSchema: {},
    permissions: {
      editable: ['title'],
      readonly: [],
      reorderable: true,
      removable: true,
      variantChangeable: true,
    },
    a11yRules: {},
    lockedByDefault: false,
  };

  const sampleBlueprint: Blueprint = {
    schemaVersion: '1.0',
    blueprintId: 'bp_core_1',
    pageId: 'page_1',
    segment: 'default',
    tokens: {
      'color.primary': '#00e5ff',
      density: 'comfortable',
    },
    layout: {
      type: 'stack',
      sections: ['cardSection'],
      gap: '16px',
    },
    components: {
      cardSection: {
        type: 'Card',
        props: { title: 'Adaptive Card' },
      },
    },
    meta: {
      generatedBy: 'test',
      createdAt: new Date().toISOString(),
    },
  };

  describe('ComponentRegistry', () => {
    it('registers and retrieves components', () => {
      const registry = createComponentRegistry();
      const mockRenderer = vi.fn();

      registry.register(sampleRegistration, mockRenderer);

      expect(registry.has('Card')).toBe(true);
      expect(registry.has('NonExistent')).toBe(false);
      expect(registry.list()).toContain('Card');
      expect(registry.getRegistration('Card')?.displayName).toBe('Card');
      expect(registry.get('Card')?.renderer).toBe(mockRenderer);
    });
  });

  describe('FallbackManager', () => {
    it('manages fallback states and records reasons', () => {
      const manager = createFallbackManager(sampleBlueprint);

      expect(manager.isFallback()).toBe(false);
      expect(manager.getDefault()?.blueprintId).toBe('bp_core_1');

      const fallbackBp = manager.fallback('Model returned invalid json');
      expect(manager.isFallback()).toBe(true);
      expect(manager.getLastReason()).toBe('Model returned invalid json');
      expect(fallbackBp?.blueprintId).toBe('bp_core_1');

      manager.clearFallback();
      expect(manager.isFallback()).toBe(false);
      expect(manager.getLastReason()).toBeUndefined();
    });
  });

  describe('UndoManager', () => {
    it('pushes blueprints and resets to default', () => {
      const defaultBp = sampleBlueprint;
      const adaptedBp: Blueprint = { ...sampleBlueprint, blueprintId: 'bp_adapted_1' };

      const undo = createUndoManager(defaultBp);
      expect(undo.canUndo()).toBe(false);
      expect(undo.depth()).toBe(1);

      undo.push(adaptedBp);
      expect(undo.canUndo()).toBe(true);
      expect(undo.depth()).toBe(2);

      const restoredDefault = undo.resetToDefault();
      expect(restoredDefault?.blueprintId).toBe('bp_core_1');
      expect(undo.canUndo()).toBe(false);
    });
  });

  describe('SignalCollector', () => {
    it('tracks consented signals into batch queue', () => {
      const collector = createSignalCollector(
        {
          enabled: true,
          types: ['click', 'scroll'],
          batchSize: 10,
          flushIntervalMs: 0,
          requireConsent: false,
        },
        { pageId: 'test-page', blueprintId: 'bp_core_1' },
      );

      collector.track('click', { elementId: 'cta-btn' });
      collector.track('scroll', { depth: 75 });
      // Not configured in types:
      collector.track('rage-click', { count: 5 });

      const queue = collector.getQueue();
      expect(queue).toHaveLength(2);
      expect(queue[0]?.type).toBe('click');
      expect(queue[0]?.properties['elementId']).toBe('cta-btn');
      expect(queue[1]?.type).toBe('scroll');
    });
  });

  describe('applyTokens', () => {
    it('applies design tokens as CSS variables on HTML element', () => {
      const el = document.createElement('div');
      applyTokens(
        {
          'color.primary': '#00e5ff',
          density: 'spacious',
        },
        el,
      );

      expect(el.style.getPropertyValue('--aui-color-primary')).toBe('#00e5ff');
      expect(el.style.getPropertyValue('--aui-density-gap')).toBe('24px');
      expect(el.style.getPropertyValue('--aui-density-padding')).toBe('32px');
    });
  });

  describe('renderBlueprint', () => {
    it('renders layout sections and components safely into DOM', async () => {
      const root = document.createElement('div');
      root.id = 'aui-root';
      document.body.appendChild(root);

      const registry = createComponentRegistry();
      registry.register(sampleRegistration, (props, container) => {
        container.innerHTML = `<h3>${props['title']}</h3>`;
      });

      const result = await renderBlueprint({
        blueprint: sampleBlueprint,
        registry,
        config: {
          rootElement: root,
          mode: 'component-mapping',
          useCssVariables: true,
          reserveDimensions: true,
          respectReducedMotion: true,
          respectColorScheme: true,
        },
      });

      expect(result.success).toBe(true);
      expect(result.fellBack).toBe(false);
      expect(root.querySelector('[data-aui-section="cardSection"]')).not.toBeNull();
      expect(root.innerHTML).toContain('Adaptive Card');
    });

    it('falls back to default blueprint if an unregistered component is encountered', async () => {
      const root = document.createElement('div');
      const registry = createComponentRegistry();
      registry.register(sampleRegistration, (props, container) => {
        container.innerHTML = `<h3>${props['title']}</h3>`;
      });

      const badBlueprint: Blueprint = {
        ...sampleBlueprint,
        components: {
          cardSection: { type: 'UnknownMysteryComponent' },
        },
      };

      const result = await renderBlueprint({
        blueprint: badBlueprint,
        registry,
        config: {
          rootElement: root,
          mode: 'component-mapping',
          useCssVariables: true,
          reserveDimensions: true,
          respectReducedMotion: true,
          respectColorScheme: true,
        },
        defaultBlueprint: sampleBlueprint,
      });

      expect(result.success).toBe(true);
      expect(result.fellBack).toBe(true);
      expect(result.blueprintUsed.blueprintId).toBe(sampleBlueprint.blueprintId);
    });
  });

  describe('createAUIClient', () => {
    it('instantiates client and initializes with default blueprint', async () => {
      const root = document.createElement('div');
      root.id = 'aui-root';
      document.body.appendChild(root);

      const client = createAUIClient({
        siteId: 'site_test',
        apiEndpoint: '',
        defaultBlueprint: sampleBlueprint,
        renderer: {
          rootElement: root,
          mode: 'component-mapping',
          useCssVariables: true,
          reserveDimensions: true,
          respectReducedMotion: true,
          respectColorScheme: true,
        },
      });

      client.registry.register(sampleRegistration, (props, container) => {
        container.innerHTML = `<span>${props['title']}</span>`;
      });

      const res = await client.init();
      expect(res?.success).toBe(true);
      expect(root.innerHTML).toContain('Adaptive Card');

      client.destroy();
    });
  });
});
