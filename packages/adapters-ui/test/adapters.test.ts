// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import type { Blueprint } from '@aui/schema';
import {
  initScriptEmbed,
  createVueAUI,
  createAUIStore,
  generateWordPressSnippet,
  parseWordPressContext,
  generateShopifyLiquidSection,
  extractShopifySegment,
} from '../src/index.js';

const mockBlueprint: Blueprint = {
  schemaVersion: '1.0',
  blueprintId: 'bp_test_adapter',
  pageId: 'landing',
  segment: 'default',
  layout: { type: 'stack', sections: ['hero'] },
  components: {
    hero: {
      type: 'Hero',
      props: {
        headline: 'Dynamic Adapter Headline',
        cta: 'Click Me',
      },
    },
  },
  meta: { createdAt: '2026-10-22T10:00:00Z' },
};

describe('@aui/adapters-ui', () => {
  it('initializes script embed client safely in DOM environment', () => {
    const root = document.createElement('div');
    root.id = 'aui-root';
    document.body.appendChild(root);

    const client = initScriptEmbed({
      siteId: 'site_test',
      autoInit: false,
    });

    expect(client).not.toBeNull();
    expect(client?.registry).toBeDefined();

    client?.destroy();
  });

  it('provides Vue 3 reactive adapter with zone mapping', () => {
    const vueAui = createVueAUI({
      siteId: 'vue_site',
      apiEndpoint: '',
      defaultBlueprint: mockBlueprint,
      renderer: {
        mode: 'hosted-pack',
        useCssVariables: true,
        reserveDimensions: false,
        respectReducedMotion: false,
        respectColorScheme: false,
      },
    });

    expect(vueAui.getCurrentBlueprint()?.blueprintId).toBe('bp_test_adapter');
    const mapped = vueAui.mapZone('hero', { title: 'headline' });
    expect(mapped).toBeDefined();
    expect(mapped?.title).toBe('Dynamic Adapter Headline');
  });

  it('provides Svelte auto-subscribable store with zone extraction', () => {
    const svelteStore = createAUIStore({
      siteId: 'svelte_site',
      apiEndpoint: '',
      defaultBlueprint: mockBlueprint,
      renderer: {
        mode: 'hosted-pack',
        useCssVariables: true,
        reserveDimensions: false,
        respectReducedMotion: false,
        respectColorScheme: false,
      },
    });

    let currentStatus = '';
    const unsub = svelteStore.subscribe((val) => {
      currentStatus = val.status;
    });

    expect(currentStatus).toBe('ready');
    const props = svelteStore.getZoneProps('hero');
    expect(props?.headline).toBe('Dynamic Adapter Headline');
    unsub();
  });

  it('generates WordPress functions.php snippet and parses WP context', () => {
    const php = generateWordPressSnippet({
      siteId: 'site_wp_123',
      apiEndpoint: 'https://api.addaptiveui.com/v1',
      lockedZones: ['pricing', 'checkout'],
    });

    expect(php).toContain("aui-engine-cdn");
    expect(php).toContain("site_wp_123");
    expect(php).toContain("add_shortcode('aui_zone'");

    const context = parseWordPressContext({
      isLoggedIn: true,
      userRoles: ['administrator'],
      postType: 'product',
      referrer: 'https://google.com',
    });

    expect(context.authenticated).toBe(true);
    expect(context.role).toBe('administrator');
    expect(context.pageType).toBe('product');
  });

  it('generates Shopify Liquid section and extracts customer segments', () => {
    const liquid = generateShopifyLiquidSection('hero');
    expect(liquid).toContain('sections/aui-zone-hero.liquid');
    expect(liquid).toContain('data-aui-zone="hero"');
    expect(liquid).toContain('window.AUI.mountZone(\'hero\')');

    const vipSegment = extractShopifySegment(
      { id: 'cust_99', tags: ['vip', 'wholesale'] },
      { itemCount: 3, totalPrice: 15000 }
    );
    expect(vipSegment).toBe('platform:shopify|returning:true|tier:vip|cart:active|cart_val:high');

    const guestSegment = extractShopifySegment(undefined, { itemCount: 0 });
    expect(guestSegment).toBe('platform:shopify|returning:false|cart:empty');
  });
});
