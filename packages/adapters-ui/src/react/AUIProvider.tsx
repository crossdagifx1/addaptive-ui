import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { Blueprint } from '@aui/schema';
import {
  createAUIClient,
  type AUIClient,
  mapComponentProps,
  type ComponentMappingConfig,
  type PropTransformRule,
} from '@aui/core';


// ─── AUI Context ────────────────────────────────────────────────────────────


export interface AUIContextValue {
  /** The underlying AUI client instance */
  client: AUIClient | null;
  /** Currently active blueprint */
  blueprint: Blueprint | null;
  /** Whether an AI-adapted variant is currently active */
  isAdapted: boolean;
  /** Reset to default blueprint */
  reset: () => Promise<void>;
  /** Apply a new blueprint */
  applyBlueprint: (bp: Blueprint) => Promise<void>;
}

const AUIContext = createContext<AUIContextValue | null>(null);

// ─── AUI Provider Props ─────────────────────────────────────────────────────

export interface AUIProviderProps {
  siteId: string;
  apiEndpoint?: string;
  defaultBlueprint?: Blueprint;
  children: React.ReactNode;
  showResetControl?: boolean;
  showExplanationControl?: boolean;
}

/**
 * React Context Provider for AUI Engine.
 */
export function AUIProvider({
  siteId,
  apiEndpoint = 'https://api.aui.dev/v1/blueprint',
  defaultBlueprint,
  children,
  showResetControl = true,
  showExplanationControl = true,
}: AUIProviderProps): React.JSX.Element {
  const [client, setClient] = useState<AUIClient | null>(null);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(defaultBlueprint || null);
  const [isAdapted, setIsAdapted] = useState<boolean>(false);

  useEffect(() => {
    const auiClient = createAUIClient({
      siteId,
      apiEndpoint,
      defaultBlueprint,
      showResetControl,
      showExplanationControl,
      renderer: {
        mode: 'component-mapping',
        useCssVariables: true,
        reserveDimensions: true,
        respectReducedMotion: true,
        respectColorScheme: true,
      },
    });

    setClient(auiClient);

    void auiClient.init().then((res) => {
      if (res?.blueprintUsed) {
        setBlueprint(res.blueprintUsed);
        setIsAdapted(!res.fellBack && res.blueprintUsed.segment !== 'default');
      }
    });

    return () => {
      auiClient.destroy();
    };
  }, [siteId, apiEndpoint, defaultBlueprint, showResetControl, showExplanationControl]);

  const reset = async () => {
    if (client) {
      const res = await client.reset();
      if (res?.blueprintUsed) {
        setBlueprint(res.blueprintUsed);
        setIsAdapted(false);
      }
    }
  };

  const applyBlueprint = async (bp: Blueprint) => {
    if (client) {
      const res = await client.applyBlueprint(bp);
      if (res?.blueprintUsed) {
        setBlueprint(res.blueprintUsed);
        setIsAdapted(true);
      }
    }
  };

  return (
    <AUIContext.Provider value={{ client, blueprint, isAdapted, reset, applyBlueprint }}>
      {children}
    </AUIContext.Provider>
  );
}

/**
 * Hook to access AUI Engine context.
 */
export function useAUI(): AUIContextValue {
  const ctx = useContext(AUIContext);
  if (!ctx) {
    throw new Error('useAUI must be used within an <AUIProvider>');
  }
  return ctx;
}

export interface AUIZoneProps {
  name: string;
  component?: React.ComponentType<any>;
  mapping?: ComponentMappingConfig | Record<string, string | PropTransformRule>;
  children?: React.ReactNode;
}

/**
 * Zone component that renders an adaptive section if present in the blueprint,
 * supporting customer-owned React components with bidirectional prop mapping,
 * or renders child fallback components.
 */
export function AUIZone({
  name,
  component: CustomComponent,
  mapping,
  children,
}: AUIZoneProps): React.JSX.Element {
  const { client, blueprint } = useAUI();
  const containerRef = useRef<HTMLDivElement>(null);
  const compDef = blueprint?.components[name];

  useEffect(() => {
    // If CustomComponent is NOT provided, fallback to imperative DOM renderer
    if (CustomComponent || !client || !compDef || !containerRef.current) return;
    const registered = client.registry.get(compDef.type);
    if (registered) {
      const cleanup = registered.renderer(compDef.props || {}, containerRef.current, compDef.variant);
      return () => {
        if (typeof cleanup === 'function') cleanup();
      };
    }
  }, [client, compDef, CustomComponent]);

  if (compDef) {
    if (CustomComponent) {
      let finalProps: Record<string, unknown> = compDef.props || {};
      if (mapping) {
        if ('propMappings' in (mapping as any)) {
          finalProps = mapComponentProps(finalProps, mapping as ComponentMappingConfig);
        } else {
          finalProps = mapComponentProps(finalProps, {
            blueprintType: compDef.type,
            targetComponent: CustomComponent.displayName || CustomComponent.name || name,
            propMappings: mapping as Record<string, string | PropTransformRule>,
          });
        }
      }

      return React.createElement(CustomComponent, finalProps);
    }
    return <div ref={containerRef} data-aui-zone={name} />;
  }

  return <>{children}</>;
}

