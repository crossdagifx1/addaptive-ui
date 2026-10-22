// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  appComponentRegistrations,
  appComponentRenderers,
  defaultDashboardBlueprint,
} from '../src/index.js';
import { createComponentRegistry, renderBlueprint } from '@aui/core';

describe('@aui/components-app', () => {
  it('registers all dashboard and app components with strict schemas', () => {
    expect(appComponentRegistrations.length).toBeGreaterThanOrEqual(6);
    const types = appComponentRegistrations.map((r) => r.type);

    expect(types).toContain('AppNav');
    expect(types).toContain('StatMetricCard');
    expect(types).toContain('MetricChart');
    expect(types).toContain('FilterBar');
    expect(types).toContain('DataTable');
    expect(types).toContain('ActivityFeed');

    // AppNav must be locked by default to protect navigation
    const appNav = appComponentRegistrations.find((r) => r.type === 'AppNav')!;
    expect(appNav.lockedByDefault).toBe(true);
  });

  it('renders StatMetricCard with trend indicators correctly', () => {
    const container = document.createElement('div');
    const renderer = appComponentRenderers.StatMetricCard;
    expect(renderer).toBeDefined();

    renderer(
      {
        title: 'Daily Active Users',
        value: '42,800',
        trend: '+24.5%',
        trendDirection: 'up',
      },
      container,
      'default'
    );

    expect(container.innerHTML).toContain('Daily Active Users');
    expect(container.innerHTML).toContain('42,800');
    expect(container.innerHTML).toContain('+24.5%');
  });

  it('renders DataTable with columns and rows', () => {
    const container = document.createElement('div');
    const renderer = appComponentRenderers.DataTable;

    renderer(
      {
        columns: [
          { key: 'name', title: 'Product' },
          { key: 'price', title: 'Price' },
        ],
        rows: [
          { name: 'AUI Starter', price: '$49' },
          { name: 'AUI Pro', price: '$199' },
        ],
      },
      container,
      'default'
    );

    expect(container.innerHTML).toContain('Product');
    expect(container.innerHTML).toContain('AUI Starter');
    expect(container.innerHTML).toContain('$199');
  });

  it('renders default dashboard blueprint safely through @aui/core renderer', async () => {
    const registry = createComponentRegistry();
    for (const reg of appComponentRegistrations) {
      registry.register(reg, appComponentRenderers[reg.type]);
    }

    const root = document.createElement('div');
    document.body.appendChild(root);

    const res = await renderBlueprint({
      blueprint: defaultDashboardBlueprint,
      registry,
      config: {
        rootElement: root,
        mode: 'hosted-pack',
        useCssVariables: true,
        reserveDimensions: false,
        respectReducedMotion: false,
        respectColorScheme: false,
      },
    });

    expect(res.success).toBe(true);
    expect(res.fellBack).toBe(false);
    expect(root.innerHTML).toContain('Enterprise Metrics');
    expect(root.innerHTML).toContain('Monthly Recurring Revenue');
    expect(root.innerHTML).toContain('Acme Global');
  });
});
