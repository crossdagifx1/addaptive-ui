import type { ComponentRegistration } from '@aui/schema';

// ─── Component Registry ─────────────────────────────────────────────────────

/**
 * Runtime component registry — maps type names to renderable implementations.
 *
 * In component-mapping mode, customers register their own components.
 * In hosted-pack mode, the engine provides its components.
 */
export interface ComponentRegistry {
  /** Register a component */
  register(registration: ComponentRegistration, renderer: ComponentRenderer): void;
  /** Get a registered component by type */
  get(type: string): RegisteredComponent | undefined;
  /** Check if a type is registered */
  has(type: string): boolean;
  /** List all registered types */
  list(): string[];
  /** Get the full registration (schema, permissions, etc.) */
  getRegistration(type: string): ComponentRegistration | undefined;
}

/** A function that renders a component to a DOM element */
export type ComponentRenderer = (
  props: Record<string, unknown>,
  container: HTMLElement,
  variant?: string,
) => void | (() => void); // returns optional cleanup function

/** A registered component: its metadata + its renderer */
export interface RegisteredComponent {
  registration: ComponentRegistration;
  renderer: ComponentRenderer;
}

/**
 * Creates a new component registry instance.
 */
export function createComponentRegistry(): ComponentRegistry {
  const components = new Map<string, RegisteredComponent>();

  return {
    register(registration, renderer) {
      components.set(registration.type, { registration, renderer });
    },
    get(type) {
      return components.get(type);
    },
    has(type) {
      return components.has(type);
    },
    list() {
      return Array.from(components.keys());
    },
    getRegistration(type) {
      return components.get(type)?.registration;
    },
  };
}
