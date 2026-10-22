/**
 * @aui/adapters-ui — Framework adapters for React, Vue, Svelte, script-embed, WordPress, and Shopify
 * @packageDocumentation
 */

// Plain JS / Web Components adapter (framework-agnostic)
export { initScriptEmbed, type ScriptEmbedConfig } from './embed.js';

// Vue 3 adapter
export { createVueAUI, AUIPlugin, type VueAUIInstance } from './vue/index.js';

// Svelte adapter
export { createAUIStore, type SvelteAUIStore } from './svelte/index.js';

// WordPress adapter & PHP integration
export {
  generateWordPressSnippet,
  parseWordPressContext,
  type WordPressAdapterConfig,
} from './wordpress/index.js';

// Shopify adapter & Liquid generation
export {
  generateShopifyLiquidSection,
  extractShopifySegment,
  type ShopifyCustomerContext,
  type ShopifyCartContext,
} from './shopify/index.js';
