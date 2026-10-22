import type { Blueprint } from '@aui/schema';

/** Configuration for the Node.js SDK */
export interface NodeSDKConfig {
  /** API key */
  apiKey: string;
  /** Site ID */
  siteId: string;
  /** API endpoint (defaults to hosted service) */
  apiEndpoint?: string;
}

/** Client for fetching and managing blueprints from the server */
export interface BlueprintClient {
  /** Fetch the blueprint for a given page and segment */
  getBlueprint(pageId: string, segmentKey: string): Promise<Blueprint>;
  /** Submit signals to the decision service */
  submitSignals(signals: unknown[]): Promise<void>;
  /** Trigger blueprint generation for a segment */
  generateBlueprint(pageId: string, segmentKey: string): Promise<Blueprint>;
}
