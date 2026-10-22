/**
 * AUI Engine Drop-In Client Embed v1.0.0
 * Zero-Flash Safe Adaptive UI Layer
 */
(function() {
  console.log('[AUI Engine] Initializing safe adaptive client layer...');
  window.AUI = {
    version: '1.0.0',
    status: 'active',
    endpoint: document.currentScript?.getAttribute('data-aui-api') || 'https://addaptive-ui.vercel.app'
  };
})();