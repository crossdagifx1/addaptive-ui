import { z } from 'zod';

// ─── Layout Section ─────────────────────────────────────────────────────────

/** A named section reference within the layout */
export type LayoutSection = string;

// ─── Layout ─────────────────────────────────────────────────────────────────

/** Layout definition — grids, sections, responsive rules, ordering */
export interface Layout {
  /** Layout type: stack (vertical), grid, split, etc. */
  type: 'stack' | 'grid' | 'split' | 'custom';
  /** Ordered list of section identifiers */
  sections: LayoutSection[];
  /** Number of grid columns (for grid type) */
  columns?: number;
  /** Gap between sections (CSS value or token ref) */
  gap?: string;
  /** Responsive overrides keyed by breakpoint name */
  responsive?: Record<string, Partial<Omit<Layout, 'responsive'>>>;
}

export const LayoutSchema = z.object({
  type: z.enum(['stack', 'grid', 'split', 'custom']),
  sections: z.array(z.string()),
  columns: z.number().int().positive().optional(),
  gap: z.string().optional(),
  responsive: z.record(z.string(), z.object({
    type: z.enum(['stack', 'grid', 'split', 'custom']).optional(),
    sections: z.array(z.string()).optional(),
    columns: z.number().int().positive().optional(),
    gap: z.string().optional(),
  })).optional(),
});
