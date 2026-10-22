import type { ComponentRegistration } from '@aui/schema';

export const appComponentRegistrations: ComponentRegistration[] = [
  {
    type: 'AppNav',
    displayName: 'Application Navigation Bar',
    description: 'Top-level enterprise application navigation with breadcrumbs and user menu.',
    propsSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        breadcrumbs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              href: { type: 'string' },
            },
            required: ['label'],
          },
        },
        links: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              action: { type: 'string' },
              active: { type: 'boolean' },
            },
            required: ['label'],
          },
        },
      },
    },
    permissions: {
      editable: ['links'],
      readonly: ['title', 'breadcrumbs'],
      reorderable: false,
      removable: false,
      variantChangeable: true,
    },
    a11yRules: {
      requiredLabels: ['aria-label'],
    },
    variants: ['default', 'compact', 'glass'],
    lockedByDefault: true, // Navigation is locked by default to prevent breaking core routing
  },
  {
    type: 'StatMetricCard',
    displayName: 'Stat Metric Card',
    description: 'KPI summary card with value, trend badge, and mini sparkline.',
    propsSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        value: { type: 'string' },
        trend: { type: 'string' },
        trendDirection: { type: 'string', enum: ['up', 'down', 'neutral'] },
        timeframe: { type: 'string' },
        sparkline: {
          type: 'array',
          items: { type: 'number' },
        },
      },
      required: ['title', 'value'],
    },
    permissions: {
      editable: ['title', 'timeframe'],
      readonly: ['value', 'trend'],
      reorderable: true,
      removable: true,
      variantChangeable: true,
    },
    a11yRules: {},
    variants: ['default', 'bordered', 'neon-glow'],
    lockedByDefault: false,
  },
  {
    type: 'MetricChart',
    displayName: 'Interactive Metric Chart',
    description: 'Line or bar chart displaying multi-series time-series analytics.',
    propsSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        chartType: { type: 'string', enum: ['line', 'bar', 'area'] },
        labels: {
          type: 'array',
          items: { type: 'string' },
        },
        datasets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              data: { type: 'array', items: { type: 'number' } },
              color: { type: 'string' },
            },
            required: ['name', 'data'],
          },
        },
      },
      required: ['title', 'chartType', 'labels', 'datasets'],
    },
    permissions: {
      editable: ['title', 'chartType'],
      readonly: ['datasets'],
      reorderable: true,
      removable: true,
      variantChangeable: true,
    },
    a11yRules: {},
    variants: ['default', 'card', 'minimal'],
    lockedByDefault: false,
  },
  {
    type: 'FilterBar',
    displayName: 'Filter & Search Bar',
    description: 'Search input, filter chips, and view options for data exploration.',
    propsSchema: {
      type: 'object',
      properties: {
        placeholder: { type: 'string' },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              label: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              selected: { type: 'string' },
            },
            required: ['key', 'label', 'options'],
          },
        },
      },
      required: ['placeholder'],
    },
    permissions: {
      editable: ['placeholder', 'filters'],
      readonly: [],
      reorderable: true,
      removable: false,
      variantChangeable: true,
    },
    a11yRules: {},
    variants: ['default', 'pills'],
    lockedByDefault: false,
  },
  {
    type: 'DataTable',
    displayName: 'Data Table',
    description: 'Responsive enterprise data table with sortable columns and status badges.',
    propsSchema: {
      type: 'object',
      properties: {
        columns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              title: { type: 'string' },
              align: { type: 'string', enum: ['left', 'center', 'right'] },
            },
            required: ['key', 'title'],
          },
        },
        rows: {
          type: 'array',
          items: { type: 'object' },
        },
        pageSize: { type: 'number' },
      },
      required: ['columns', 'rows'],
    },
    permissions: {
      editable: ['pageSize'],
      readonly: ['columns', 'rows'],
      reorderable: true,
      removable: false,
      variantChangeable: true,
    },
    a11yRules: {},
    variants: ['default', 'striped', 'compact'],
    lockedByDefault: false,
  },
  {
    type: 'ActivityFeed',
    displayName: 'Activity Feed',
    description: 'Chronological timeline of system and team activity events.',
    propsSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              actor: { type: 'string' },
              action: { type: 'string' },
              target: { type: 'string' },
              timestamp: { type: 'string' },
            },
            required: ['actor', 'action'],
          },
        },
      },
      required: ['title', 'events'],
    },
    permissions: {
      editable: ['title'],
      readonly: ['events'],
      reorderable: true,
      removable: true,
      variantChangeable: true,
    },
    a11yRules: {},
    variants: ['default', 'timeline', 'compact'],
    lockedByDefault: false,
  },
];
