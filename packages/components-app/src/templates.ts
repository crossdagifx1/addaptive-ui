import type { Blueprint } from '@aui/schema';

export const defaultDashboardBlueprint: Blueprint = {
  schemaVersion: '1.0',
  blueprintId: 'bp_app_dashboard_default',
  pageId: 'dashboard-analytics',
  segment: 'default',
  tokens: {
    'color.primary': '#00E5FF',
    'color.secondary': '#D4AF37',
    'color.background': '#0A0A0F',
    'color.surface': '#111118',
    'font.heading': 'Inter, system-ui, sans-serif',
    'font.body': 'Inter, system-ui, sans-serif',
    density: 'comfortable',
  },
  layout: {
    type: 'stack',
    sections: ['nav', 'metricRow1', 'analyticsChart', 'filterBar', 'userTable', 'activityFeed'],
    gap: '24px',
  },
  components: {
    nav: {
      type: 'AppNav',
      locked: true,
      props: {
        title: 'Enterprise Metrics',
        breadcrumbs: [{ label: 'Analytics' }, { label: 'Overview' }],
        links: [
          { label: 'Overview', active: true },
          { label: 'Reports' },
          { label: 'Settings' },
        ],
      },
    },
    metricRow1: {
      type: 'StatMetricCard',
      props: {
        title: 'Monthly Recurring Revenue',
        value: '$148,250',
        trend: '+18.4%',
        trendDirection: 'up',
        timeframe: 'vs last month',
      },
    },
    analyticsChart: {
      type: 'MetricChart',
      props: {
        title: 'Conversion Lift by Model Engine',
        chartType: 'bar',
        labels: ['Sonnet 3.7', 'OpenAI o3', 'Gemini 2.5', 'Llama 3.3', 'Baseline'],
        datasets: [
          {
            name: 'Lift %',
            data: [58, 54, 51, 44, 20],
            color: '#00E5FF',
          },
        ],
      },
    },
    filterBar: {
      type: 'FilterBar',
      props: {
        placeholder: 'Search customer accounts...',
        filters: [
          {
            key: 'tier',
            label: 'Plan Tier',
            options: ['Enterprise', 'Business', 'Growth'],
            selected: '',
          },
        ],
      },
    },
    userTable: {
      type: 'DataTable',
      props: {
        columns: [
          { key: 'customer', title: 'Customer' },
          { key: 'plan', title: 'Plan' },
          { key: 'status', title: 'Status' },
          { key: 'mrr', title: 'MRR', align: 'right' },
        ],
        rows: [
          { customer: 'Acme Global', plan: 'Enterprise Pro', status: 'Active', mrr: '$12,500' },
          { customer: 'Vortex Labs', plan: 'Business Scale', status: 'Active', mrr: '$4,800' },
          { customer: 'Hyperion AI', plan: 'Enterprise Pro', status: 'Active', mrr: '$18,000' },
        ],
      },
    },
    activityFeed: {
      type: 'ActivityFeed',
      props: {
        title: 'Audit & Adaptation Events',
        events: [
          { id: '1', actor: 'AUI Engine', action: 'applied variant to segment', target: 'ref:google-ads', timestamp: '2m ago' },
          { id: '2', actor: 'Sarah Admin', action: 'approved canary rollout', target: '5% traffic', timestamp: '14m ago' },
        ],
      },
    },
  },
  meta: {
    generatedBy: 'system:default-app-pack',
    createdAt: '2026-10-22T10:00:00Z',
    reasoning: 'Default enterprise SaaS dashboard layout with metrics, charts, and activity audit.',
  },
};
