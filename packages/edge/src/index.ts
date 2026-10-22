/**
 * @aui/edge — Edge/SSR renderer and variant lookup
 *
 * Renders blueprints server-side or at the edge for SEO and fast first paint.
 *
 * @packageDocumentation
 */

export { type EdgeConfig, type VariantLookupResult } from './types.js';
export {
  type EdgeVariantService,
  createEdgeVariantService,
  isCrawler,
} from './service.js';
