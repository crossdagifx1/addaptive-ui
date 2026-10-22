import { createAUIClient, type AUIClient } from '@aui/core';

/** Configuration for the plain <script> embed mode */
export interface ScriptEmbedConfig {
  /** Site ID */
  siteId: string;
  /** API endpoint */
  apiEndpoint?: string;
  /** Auto-initialize on load */
  autoInit?: boolean;
  /** Root element selector */
  rootSelector?: string;
}

/**
 * Initializes AUI Engine from a plain <script> tag integration.
 * Supports auto-discovering data-site on the current script tag.
 */
export function initScriptEmbed(config?: Partial<ScriptEmbedConfig>): AUIClient | null {
  if (typeof document === 'undefined') return null;

  let siteId = config?.siteId;
  let apiEndpoint = config?.apiEndpoint;

  // Auto-detect attributes from current script tag if not provided
  if (!siteId && document.currentScript) {
    siteId = document.currentScript.getAttribute('data-site') || undefined;
    apiEndpoint = document.currentScript.getAttribute('data-endpoint') || apiEndpoint;
  }

  if (!siteId) {
    siteId = 'default-site';
  }

  const client = createAUIClient({
    siteId,
    apiEndpoint: apiEndpoint || 'https://api.aui.dev/v1/blueprint',
    renderer: {
      rootElement: config?.rootSelector || '#aui-root',
      mode: 'component-mapping',
      useCssVariables: true,
      reserveDimensions: true,
      respectReducedMotion: true,
      respectColorScheme: true,
    },
    showResetControl: true,
    showExplanationControl: true,
  });

  if (config?.autoInit !== false) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        void client.init();
      });
    } else {
      void client.init();
    }
  }

  return client;
}
