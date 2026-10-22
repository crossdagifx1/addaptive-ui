import type { ComponentRenderer, ComponentRegistry } from '@aui/core';
import { landingComponentRegistrations } from './registrations.js';

/**
 * Escapes HTML characters to prevent XSS.
 */
function escapeHtml(str: unknown): string {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Modern, responsive renderers for all 11 Landing Page Pack components.
 */
export const landingRenderers: Record<string, ComponentRenderer> = {
  Nav: (props, container, variant = 'solid') => {
    const links = (props.links as Array<{ label: string; href: string }>) || [];
    const logo = (props.logo as { src?: string; alt?: string; text?: string }) || { text: 'AUI Engine' };
    const cta = props.cta as { label?: string; action?: string } | undefined;

    const bgStyles =
      variant === 'transparent'
        ? 'background: transparent;'
        : variant === 'floating'
        ? 'background: rgba(17, 17, 24, 0.75); backdrop-filter: blur(16px); margin: 12px auto; max-width: 1200px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.1);'
        : 'background: var(--aui-color-surface, #111118); border-bottom: 1px solid rgba(255,255,255,0.08);';

    container.innerHTML = `
      <nav style="${bgStyles} padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; font-family: var(--aui-font-body, system-ui, sans-serif); color: var(--aui-color-text, #f5f5f5);">
        <div style="display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 18px; letter-spacing: -0.5px;">
          ${logo.src ? `<img src="${escapeHtml(logo.src)}" alt="${escapeHtml(logo.alt || 'Logo')}" style="height: 28px; width: auto;" />` : ''}
          <span>${escapeHtml(logo.text || logo.alt || 'AUI Engine')}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 24px;">
          ${links
            .map(
              (l) =>
                `<a href="${escapeHtml(l.href)}" style="color: rgba(245,245,245,0.7); text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(245,245,245,0.7)'">${escapeHtml(l.label)}</a>`,
            )
            .join('')}
          ${
            cta?.label
              ? `<a href="${escapeHtml(cta.action || '#')}" style="background: var(--aui-color-primary, #00e5ff); color: #0a0a0f; padding: 8px 18px; border-radius: 999px; font-weight: 600; font-size: 14px; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 0 16px rgba(0,229,255,0.25);">${escapeHtml(cta.label)}</a>`
              : ''
          }
        </div>
      </nav>
    `;
  },

  Hero: (props, container, variant = 'centered') => {
    const headline = escapeHtml(props.headline || 'Adaptive UI That Reshapes Per Visitor');
    const subheadline = escapeHtml(
      props.subheadline || 'Drop-in adaptive engine that personalizes messaging and UI per visitor safely with any AI model.',
    );
    const primaryCta = props.primaryCta as { label?: string; action?: string } | undefined;
    const secondaryCta = props.secondaryCta as { label?: string; action?: string } | undefined;
    const isSplit = variant === 'split';

    container.innerHTML = `
      <div style="padding: 80px 24px; max-width: 1200px; margin: 0 auto; display: flex; flex-direction: ${isSplit ? 'row' : 'column'}; align-items: center; text-align: ${isSplit ? 'left' : 'center'}; gap: 40px; font-family: var(--aui-font-body, system-ui, sans-serif);">
        <div style="flex: 1; max-width: ${isSplit ? '600px' : '840px'};">
          <div style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 14px; border-radius: 999px; background: rgba(0, 229, 255, 0.1); border: 1px solid rgba(0, 229, 255, 0.25); color: #00e5ff; font-size: 12px; font-weight: 600; margin-bottom: 24px;">
            <span>✨ Model-Agnostic Adaptive Engine</span>
          </div>
          <h1 style="font-size: clamp(32px, 5vw, 56px); font-weight: 800; line-height: 1.1; letter-spacing: -1.5px; color: var(--aui-color-text, #f5f5f5); margin: 0 0 20px 0; font-family: var(--aui-font-heading, system-ui, sans-serif);">
            ${headline}
          </h1>
          <p style="font-size: clamp(16px, 2vw, 20px); line-height: 1.6; color: rgba(245,245,245,0.65); margin: 0 0 32px 0;">
            ${subheadline}
          </p>
          <div style="display: flex; gap: 16px; justify-content: ${isSplit ? 'flex-start' : 'center'}; flex-wrap: wrap;">
            ${
              primaryCta?.label
                ? `<a href="${escapeHtml(primaryCta.action || '#')}" style="background: var(--aui-color-primary, #00e5ff); color: #0a0a0f; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 16px; text-decoration: none; box-shadow: 0 4px 24px rgba(0,229,255,0.3); transition: transform 0.2s;">${escapeHtml(primaryCta.label)}</a>`
                : ''
            }
            ${
              secondaryCta?.label
                ? `<a href="${escapeHtml(secondaryCta.action || '#')}" style="background: rgba(255,255,255,0.06); color: #f5f5f5; border: 1px solid rgba(255,255,255,0.15); padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 16px; text-decoration: none; backdrop-filter: blur(10px);">${escapeHtml(secondaryCta.label)}</a>`
                : ''
            }
          </div>
        </div>
      </div>
    `;
  },

  LogoCloud: (props, container) => {
    const caption = escapeHtml(props.caption || 'TRUSTED BY INNOVATIVE ENGINEERING TEAMS WORLDWIDE');
    const logos = (props.logos as Array<{ src?: string; alt?: string; text?: string }>) || [
      { text: 'Acme Corp' },
      { text: 'Pulse AI' },
      { text: 'VectorFlow' },
      { text: 'HyperScale' },
      { text: 'NovaGrid' },
    ];

    container.innerHTML = `
      <div style="padding: 40px 24px; max-width: 1200px; margin: 0 auto; text-align: center; font-family: var(--aui-font-body, system-ui, sans-serif);">
        <p style="font-size: 12px; font-weight: 600; letter-spacing: 1.5px; color: rgba(245,245,245,0.4); text-transform: uppercase; margin-bottom: 24px;">
          ${caption}
        </p>
        <div style="display: flex; justify-content: center; align-items: center; gap: 48px; flex-wrap: wrap; opacity: 0.65;">
          ${logos
            .map(
              (l) =>
                `<span style="font-size: 18px; font-weight: 700; color: #f5f5f5; letter-spacing: -0.5px;">${escapeHtml(l.text || l.alt || '')}</span>`,
            )
            .join('')}
        </div>
      </div>
    `;
  },

  FeatureGrid: (props, container) => {
    const items = (props.items as Array<{ title: string; text: string; icon?: string }>) || [];

    container.innerHTML = `
      <div style="padding: 60px 24px; max-width: 1200px; margin: 0 auto; font-family: var(--aui-font-body, system-ui, sans-serif);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
          ${items
            .map(
              (item) => `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 28px; backdrop-filter: blur(12px); transition: transform 0.2s, border-color 0.2s;">
              <div style="font-size: 24px; margin-bottom: 16px; display: inline-block; padding: 8px 12px; background: rgba(0,229,255,0.1); border-radius: 10px; color: #00e5ff;">
                ${escapeHtml(item.icon || '⚡')}
              </div>
              <h3 style="font-size: 18px; font-weight: 700; color: #f5f5f5; margin: 0 0 10px 0; letter-spacing: -0.3px;">
                ${escapeHtml(item.title)}
              </h3>
              <p style="font-size: 14px; line-height: 1.6; color: rgba(245,245,245,0.6); margin: 0;">
                ${escapeHtml(item.text)}
              </p>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  },

  Testimonials: (props, container) => {
    const quotes = (props.quotes as Array<{ name: string; role: string; text: string; avatar?: string }>) || [];

    container.innerHTML = `
      <div style="padding: 60px 24px; max-width: 1200px; margin: 0 auto; font-family: var(--aui-font-body, system-ui, sans-serif);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
          ${quotes
            .map(
              (q) => `
            <div style="background: rgba(17, 17, 24, 0.7); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 28px;">
              <p style="font-size: 15px; line-height: 1.6; color: rgba(245,245,245,0.85); font-style: italic; margin: 0 0 20px 0;">
                "${escapeHtml(q.text)}"
              </p>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #00e5ff, #6b5b8a); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #0a0a0f;">
                  ${escapeHtml(q.name.charAt(0))}
                </div>
                <div>
                  <div style="font-weight: 700; font-size: 14px; color: #f5f5f5;">${escapeHtml(q.name)}</div>
                  <div style="font-size: 12px; color: rgba(245,245,245,0.5);">${escapeHtml(q.role)}</div>
                </div>
              </div>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  },

  PricingTable: (props, container) => {
    const plans = (props.plans as Array<{ name: string; price: string; period?: string; features: string[]; popular?: boolean; cta?: string }>) || [];

    container.innerHTML = `
      <div style="padding: 60px 24px; max-width: 1200px; margin: 0 auto; font-family: var(--aui-font-body, system-ui, sans-serif);">
        <div style="text-align: center; margin-bottom: 48px;">
          <h2 style="font-size: 32px; font-weight: 800; color: #f5f5f5; margin: 0 0 12px 0;">Simple, Transparent Pricing</h2>
          <p style="font-size: 16px; color: rgba(245,245,245,0.6); margin: 0;">Pricing zones are locked and protected from unapproved AI modifications.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; align-items: stretch;">
          ${plans
            .map(
              (p) => `
            <div style="background: ${p.popular ? 'rgba(0,229,255,0.04)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${p.popular ? '#00e5ff' : 'rgba(255,255,255,0.08)'}; border-radius: 20px; padding: 32px; display: flex; flex-direction: column; position: relative;">
              ${p.popular ? `<div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #00e5ff; color: #0a0a0f; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 12px; border-radius: 999px;">Most Popular</div>` : ''}
              <h3 style="font-size: 20px; font-weight: 700; color: #f5f5f5; margin: 0 0 8px 0;">${escapeHtml(p.name)}</h3>
              <div style="font-size: 36px; font-weight: 800; color: #f5f5f5; margin: 12px 0 24px 0;">
                ${escapeHtml(p.price)}<span style="font-size: 14px; font-weight: 500; color: rgba(245,245,245,0.5);">${escapeHtml(p.period || '/mo')}</span>
              </div>
              <ul style="list-style: none; padding: 0; margin: 0 0 32px 0; flex: 1;">
                ${p.features
                  .map(
                    (f) => `
                  <li style="font-size: 14px; color: rgba(245,245,245,0.8); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                    <span style="color: #00e5ff; font-weight: 800;">✓</span> ${escapeHtml(f)}
                  </li>
                `,
                  )
                  .join('')}
              </ul>
              <button style="width: 100%; padding: 12px; border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer; border: none; background: ${p.popular ? '#00e5ff' : 'rgba(255,255,255,0.1)'}; color: ${p.popular ? '#0a0a0f' : '#f5f5f5'}; transition: transform 0.2s;">
                ${escapeHtml(p.cta || 'Get Started')}
              </button>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  },

  FAQ: (props, container) => {
    const items = (props.items as Array<{ q: string; a: string }>) || [];

    container.innerHTML = `
      <div style="padding: 60px 24px; max-width: 800px; margin: 0 auto; font-family: var(--aui-font-body, system-ui, sans-serif);">
        <h2 style="font-size: 28px; font-weight: 800; color: #f5f5f5; text-align: center; margin: 0 0 36px 0;">Frequently Asked Questions</h2>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${items
            .map(
              (item, idx) => `
            <details style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px 20px; cursor: pointer;" ${idx === 0 ? 'open' : ''}>
              <summary style="font-weight: 700; color: #f5f5f5; font-size: 16px; outline: none;">${escapeHtml(item.q)}</summary>
              <p style="margin: 12px 0 0 0; font-size: 14px; line-height: 1.6; color: rgba(245,245,245,0.7);">${escapeHtml(item.a)}</p>
            </details>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  },

  CTA: (props, container) => {
    const headline = escapeHtml(props.headline || 'Ready to transform your site experience?');
    const button = props.button as { label?: string; action?: string } | undefined;

    container.innerHTML = `
      <div style="padding: 80px 24px; max-width: 1000px; margin: 0 auto; text-align: center; font-family: var(--aui-font-body, system-ui, sans-serif);">
        <div style="background: linear-gradient(135deg, rgba(0,229,255,0.12), rgba(107,91,138,0.15)); border: 1px solid rgba(0,229,255,0.25); border-radius: 24px; padding: 48px 32px;">
          <h2 style="font-size: clamp(24px, 4vw, 36px); font-weight: 800; color: #f5f5f5; margin: 0 0 20px 0;">${headline}</h2>
          ${
            button?.label
              ? `<a href="${escapeHtml(button.action || '#')}" style="display: inline-block; background: var(--aui-color-primary, #00e5ff); color: #0a0a0f; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 16px; text-decoration: none; box-shadow: 0 4px 24px rgba(0,229,255,0.3);">${escapeHtml(button.label)}</a>`
              : ''
          }
        </div>
      </div>
    `;
  },

  LeadForm: (props, container) => {
    const fields = (props.fields as Array<{ name: string; label: string; type: string }>) || [
      { name: 'email', label: 'Work Email', type: 'email' },
    ];
    const consent = escapeHtml(props.consent || 'By submitting, you agree to our privacy policy and terms.');

    container.innerHTML = `
      <div style="padding: 40px 24px; max-width: 480px; margin: 0 auto; font-family: var(--aui-font-body, system-ui, sans-serif);">
        <form style="background: rgba(17, 17, 24, 0.85); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px;" onsubmit="event.preventDefault();">
          ${fields
            .map(
              (f) => `
            <div style="margin-bottom: 16px;">
              <label style="display: block; font-size: 13px; font-weight: 600; color: #f5f5f5; margin-bottom: 6px;">${escapeHtml(f.label)}</label>
              <input type="${escapeHtml(f.type)}" name="${escapeHtml(f.name)}" required style="width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 10px 14px; color: #fff; font-size: 14px;" />
            </div>
          `,
            )
            .join('')}
          <button type="submit" style="width: 100%; padding: 12px; border-radius: 8px; font-weight: 700; font-size: 14px; background: #00e5ff; color: #0a0a0f; border: none; cursor: pointer; margin-top: 8px;">
            Submit
          </button>
          <p style="font-size: 11px; color: rgba(245,245,245,0.5); text-align: center; margin: 12px 0 0 0;">${consent}</p>
        </form>
      </div>
    `;
  },

  LegalFooter: (props, container) => {
    const text = escapeHtml(props.text || `© ${new Date().getFullYear()} AUI Engine. All rights reserved.`);
    const links = (props.links as Array<{ label: string; href: string }>) || [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Security', href: '/security' },
    ];

    container.innerHTML = `
      <footer style="padding: 40px 24px; border-top: 1px solid rgba(255,255,255,0.08); font-family: var(--aui-font-body, system-ui, sans-serif); color: rgba(245,245,245,0.5); font-size: 13px;">
        <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>${text}</div>
          <div style="display: flex; gap: 20px;">
            ${links
              .map(
                (l) =>
                  `<a href="${escapeHtml(l.href)}" style="color: rgba(245,245,245,0.6); text-decoration: none;">${escapeHtml(l.label)}</a>`,
              )
              .join('')}
          </div>
        </div>
      </footer>
    `;
  },

  Banner: (props, container) => {
    const text = escapeHtml(props.text || '🚀 New: Full support for local models via Ollama & OpenAI-compatible endpoints');
    const action = props.action as { label?: string; href?: string } | undefined;

    container.innerHTML = `
      <div style="background: linear-gradient(90deg, #0d6e6e, #14b8a6); color: #fff; padding: 10px 24px; font-family: var(--aui-font-body, system-ui, sans-serif); font-size: 13px; font-weight: 500; text-align: center; display: flex; align-items: center; justify-content: center; gap: 12px;">
        <span>${text}</span>
        ${
          action?.label
            ? `<a href="${escapeHtml(action.href || '#')}" style="color: #fff; font-weight: 700; text-decoration: underline;">${escapeHtml(action.label)} →</a>`
            : ''
        }
      </div>
    `;
  },
};

/**
 * Registers all 11 landing pack components into an AUI ComponentRegistry.
 */
export function registerLandingComponents(registry: ComponentRegistry): void {
  for (const registration of landingComponentRegistrations) {
    const renderer = landingRenderers[registration.type];
    if (renderer) {
      registry.register(registration, renderer);
    }
  }
}
