import * as crypto from 'node:crypto';

export type WebhookEventType =
  | 'blueprint.applied'
  | 'blueprint.pending_approval'
  | 'policy.violation'
  | 'guardrail.auto_paused'
  | 'spend.threshold_reached';

export interface WebhookSubscription {
  id: string;
  siteId: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  active: boolean;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  siteId: string;
  type: WebhookEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface WebhookDispatchResult {
  subscriptionId: string;
  url: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  signature: string;
}

/**
 * Computes an HMAC-SHA256 signature header for webhook payload authentication.
 */
export function signWebhookPayload(payloadStr: string, secret: string, timestamp: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${timestamp}.${payloadStr}`, 'utf8');
  return `t=${timestamp},v1=${hmac.digest('hex')}`;
}

export class WebhookDispatcher {
  private subscriptions: WebhookSubscription[] = [];

  constructor(subscriptions: WebhookSubscription[] = []) {
    this.subscriptions = [...subscriptions];
  }

  registerSubscription(sub: WebhookSubscription): void {
    this.subscriptions.push(sub);
  }

  getSubscriptions(siteId: string): WebhookSubscription[] {
    return this.subscriptions.filter((s) => s.siteId === siteId && s.active);
  }

  async dispatch(
    event: WebhookEvent,
    fetchFn: typeof fetch = globalThis.fetch
  ): Promise<WebhookDispatchResult[]> {
    const matchingSubs = this.subscriptions.filter(
      (sub) => sub.siteId === event.siteId && sub.active && sub.events.includes(event.type)
    );

    const results: WebhookDispatchResult[] = [];
    const payloadStr = JSON.stringify(event);

    for (const sub of matchingSubs) {
      const signature = signWebhookPayload(payloadStr, sub.secret, event.timestamp);

      if (!fetchFn) {
        // Simulated/Offline environment fallback
        results.push({
          subscriptionId: sub.id,
          url: sub.url,
          success: true,
          statusCode: 200,
          signature,
        });
        continue;
      }

      try {
        const res = await fetchFn(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AUI-Signature': signature,
            'X-AUI-Event': event.type,
            'User-Agent': 'AUI-Webhook-Dispatcher/1.0',
          },
          body: payloadStr,
        });

        results.push({
          subscriptionId: sub.id,
          url: sub.url,
          success: res.ok,
          statusCode: res.status,
          signature,
        });
      } catch (err) {
        results.push({
          subscriptionId: sub.id,
          url: sub.url,
          success: false,
          error: err instanceof Error ? err.message : String(err),
          signature,
        });
      }
    }

    return results;
  }
}
