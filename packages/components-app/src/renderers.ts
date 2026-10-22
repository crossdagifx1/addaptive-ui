import type { ComponentRenderer } from '@aui/core';

export const appComponentRenderers: Record<string, ComponentRenderer> = {
  AppNav: (props, container, variant) => {
    const title = (props.title as string) || 'Dashboard';
    const breadcrumbs = (props.breadcrumbs as Array<{ label: string; href?: string }>) || [];
    const links = (props.links as Array<{ label: string; action?: string; active?: boolean }>) || [];

    const breadcrumbsHtml = breadcrumbs
      .map((b) => `<span class="aui-nav-crumb">${b.label}</span>`)
      .join(' <span style="opacity: 0.4">/</span> ');

    const linksHtml = links
      .map(
        (l) =>
          `<a href="#" class="aui-nav-link ${l.active ? 'active' : ''}" style="color: ${
            l.active ? 'var(--aui-color-primary, #00E5FF)' : 'var(--aui-color-text-secondary, #9090A8)'
          }; text-decoration: none; font-size: 14px; font-weight: 500;">${l.label}</a>`
      )
      .join('');

    container.innerHTML = `
      <nav class="aui-app-nav ${variant || 'default'}" style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 24px;
        background: var(--aui-color-surface1, #111118);
        border-bottom: 1px solid var(--aui-border-glow, #2A2A40);
        font-family: var(--aui-font-body, system-ui, sans-serif);
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-weight: 700; font-size: 16px; color: var(--aui-color-text-primary, #F5F5F5);">${title}</span>
          ${breadcrumbs.length > 0 ? `<div style="font-size: 13px; color: #9090A8;">${breadcrumbsHtml}</div>` : ''}
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          ${linksHtml}
        </div>
      </nav>
    `;
    return () => {
      container.innerHTML = '';
    };
  },

  StatMetricCard: (props, container, variant) => {
    const title = (props.title as string) || 'Metric';
    const value = (props.value as string) || '0';
    const trend = (props.trend as string) || '';
    const trendDir = (props.trendDirection as string) || 'up';
    const timeframe = (props.timeframe as string) || 'vs last month';

    const trendColor = trendDir === 'up' ? '#10B981' : trendDir === 'down' ? '#EF4444' : '#9090A8';
    const trendIcon = trendDir === 'up' ? '↑' : trendDir === 'down' ? '↓' : '→';

    container.innerHTML = `
      <div class="aui-stat-card ${variant || 'default'}" style="
        background: var(--aui-color-surface1, #111118);
        border: 1px solid var(--aui-border-glow, #2A2A40);
        border-radius: var(--aui-radius-card, 16px);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-family: var(--aui-font-body, system-ui, sans-serif);
      ">
        <div style="font-size: 13px; color: var(--aui-color-text-secondary, #9090A8); font-weight: 500;">
          ${title}
        </div>
        <div style="font-size: 32px; font-weight: 800; color: var(--aui-color-text-primary, #F5F5F5); letter-spacing: -0.5px;">
          ${value}
        </div>
        ${
          trend
            ? `<div style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
                 <span style="color: ${trendColor}; font-weight: 600;">${trendIcon} ${trend}</span>
                 <span style="color: #666680;">${timeframe}</span>
               </div>`
            : ''
        }
      </div>
    `;
    return () => {
      container.innerHTML = '';
    };
  },

  MetricChart: (props, container, variant) => {
    const title = (props.title as string) || 'Performance Chart';
    const chartType = (props.chartType as string) || 'line';
    const labels = (props.labels as string[]) || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const datasets = (props.datasets as Array<{ name: string; data: number[]; color?: string }>) || [];

    const barsHtml = labels
      .map((lbl, idx) => {
        const val = datasets[0]?.data[idx] || Math.floor(Math.random() * 80 + 20);
        const color = datasets[0]?.color || 'var(--aui-color-primary, #00E5FF)';
        return `
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
            <div style="width: 100%; max-width: 28px; height: ${val}px; background: ${color}; border-radius: 4px 4px 0 0;"></div>
            <span style="font-size: 10px; color: #9090A8;">${lbl}</span>
          </div>
        `;
      })
      .join('');

    container.innerHTML = `
      <div class="aui-metric-chart ${variant || 'default'}" style="
        background: var(--aui-color-surface1, #111118);
        border: 1px solid var(--aui-border-glow, #2A2A40);
        border-radius: var(--aui-radius-card, 16px);
        padding: 24px;
        font-family: var(--aui-font-body, system-ui, sans-serif);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="font-size: 16px; font-weight: 600; color: #F5F5F5; margin: 0;">${title}</h3>
          <span style="font-size: 11px; padding: 4px 8px; border-radius: 999px; background: rgba(0, 229, 255, 0.1); color: #00E5FF; font-weight: 600;">
            ${chartType.toUpperCase()}
          </span>
        </div>
        <div style="height: 120px; display: flex; align-items: flex-end; gap: 8px; border-bottom: 1px solid #2A2A40; padding-bottom: 8px;">
          ${barsHtml}
        </div>
      </div>
    `;
    return () => {
      container.innerHTML = '';
    };
  },

  FilterBar: (props, container, variant) => {
    const placeholder = (props.placeholder as string) || 'Search records...';
    const filters = (props.filters as Array<{ key: string; label: string; options: string[]; selected?: string }>) || [];

    const filtersHtml = filters
      .map(
        (f) => `
        <select style="
          background: #1A1A25;
          border: 1px solid #2A2A40;
          color: #F5F5F5;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
        ">
          <option value="">${f.label}: All</option>
          ${f.options.map((opt) => `<option value="${opt}" ${f.selected === opt ? 'selected' : ''}>${opt}</option>`).join('')}
        </select>
      `
      )
      .join('');

    container.innerHTML = `
      <div class="aui-filter-bar ${variant || 'default'}" style="
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
        padding: 12px 16px;
        background: #111118;
        border: 1px solid #2A2A40;
        border-radius: 12px;
        font-family: system-ui, sans-serif;
      ">
        <input type="text" placeholder="${placeholder}" style="
          flex: 1;
          min-width: 200px;
          background: #1A1A25;
          border: 1px solid #2A2A40;
          color: #F5F5F5;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
        " />
        ${filtersHtml}
      </div>
    `;
    return () => {
      container.innerHTML = '';
    };
  },

  DataTable: (props, container, variant) => {
    const columns = (props.columns as Array<{ key: string; title: string; align?: string }>) || [];
    const rows = (props.rows as Array<Record<string, any>>) || [];

    const headersHtml = columns
      .map(
        (c) => `
        <th style="
          text-align: ${c.align || 'left'};
          padding: 10px 16px;
          font-size: 12px;
          font-weight: 600;
          color: #9090A8;
          border-bottom: 1px solid #2A2A40;
          text-transform: uppercase;
        ">${c.title}</th>
      `
      )
      .join('');

    const rowsHtml = rows
      .map(
        (row) => `
        <tr style="border-bottom: 1px solid #1A1A25;">
          ${columns
            .map(
              (c) => `
            <td style="
              text-align: ${c.align || 'left'};
              padding: 12px 16px;
              font-size: 13px;
              color: #F5F5F5;
            ">${String(row[c.key] ?? '')}</td>
          `
            )
            .join('')}
        </tr>
      `
      )
      .join('');

    container.innerHTML = `
      <div class="aui-data-table-wrapper ${variant || 'default'}" style="
        background: #111118;
        border: 1px solid #2A2A40;
        border-radius: 16px;
        overflow: hidden;
        font-family: system-ui, sans-serif;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #1A1A25;">${headersHtml}</tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
    return () => {
      container.innerHTML = '';
    };
  },

  ActivityFeed: (props, container, variant) => {
    const title = (props.title as string) || 'Recent Activity';
    const events = (props.events as Array<{ id?: string; actor: string; action: string; target?: string; timestamp?: string }>) || [];

    const eventsHtml = events
      .map(
        (ev) => `
        <div style="display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #1A1A25;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #00E5FF; margin-top: 6px;"></div>
          <div style="flex: 1; font-size: 13px;">
            <strong style="color: #F5F5F5;">${ev.actor}</strong>
            <span style="color: #9090A8;"> ${ev.action}</span>
            ${ev.target ? `<span style="color: #00E5FF;"> ${ev.target}</span>` : ''}
          </div>
          ${ev.timestamp ? `<span style="font-size: 11px; color: #55556A;">${ev.timestamp}</span>` : ''}
        </div>
      `
      )
      .join('');

    container.innerHTML = `
      <div class="aui-activity-feed ${variant || 'default'}" style="
        background: #111118;
        border: 1px solid #2A2A40;
        border-radius: 16px;
        padding: 20px;
        font-family: system-ui, sans-serif;
      ">
        <h4 style="font-size: 15px; font-weight: 600; color: #F5F5F5; margin: 0 0 12px 0;">${title}</h4>
        <div>${eventsHtml}</div>
      </div>
    `;
    return () => {
      container.innerHTML = '';
    };
  },
};
